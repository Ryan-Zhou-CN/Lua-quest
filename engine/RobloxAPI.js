/**
 * RobloxAPI.js — Luau 侧全局环境的 JS 实现层（P0）
 * 
 * 设计原则（对应 Oracle 裁决方案 C）：
 * - 高频、数学、树操作：JS 侧 Mutable 实现，零 GC 压力、Luau 直接读写
 * - 业务逻辑复杂、易变：Luau 侧 ModuleScript 实现（DataStore、TweenService 等）
 * - 跨 VM 边界（网络/输入）：JS 侧存根 + Luau 侧协议
 * 
 * 所有可被 Luau 写入的对象必须用 Mutable() 包装（luau-web 要求）
 */

import { Mutable } from "luau-web";

// ============================================
// 基础数学类型（高频、纯计算、零状态）
// ============================================

/** 创建 Vector3 构造器与静态方法 */
function createVector3() {
  const Vector3 = Mutable({
    new: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    zero: { x: 0, y: 0, z: 0 },
    one: { x: 1, y: 1, z: 1 },
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
    // 实例方法（Luau 侧以 `v:method()` 调用，第一参数自动绑定 self）
    // 注意：luau-web 会自动处理方法调用，这里定义为接收 self 的函数
    magnitude: (self) => Math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z),
    dot: (self, other) => self.x * other.x + self.y * other.y + self.z * other.z,
    cross: (self, other) => ({
      x: self.y * other.z - self.z * other.y,
      y: self.z * other.x - self.x * other.z,
      z: self.x * other.y - self.y * other.x,
    }),
    lerp: (self, goal, alpha) => ({
      x: self.x + (goal.x - self.x) * alpha,
      y: self.y + (goal.y - self.y) * alpha,
      z: self.z + (goal.z - self.z) * alpha,
    }),
    // 元方法：运算符重载
    __add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    __sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    __mul: (a, b) => {
      if (typeof b === 'number') {
        return { x: a.x * b, y: a.y * b, z: a.z * b };
      }
      // assume b is Vector3
      return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
    },
    __div: (a, b) => {
      if (typeof b === 'number') {
        return { x: a.x / b, y: a.y / b, z: a.z / b };
      }
      // component-wise division
      return { x: a.x / b.x, y: a.y / b.y, z: a.z / b.z };
    },
    __unm: (a) => ({ x: -a.x, y: -a.y, z: -a.z }),
    __eq: (a, b) => a.x === b.x && a.y === b.y && a.z === b.z,
    __tostring: (a) => `(${a.x}, ${a.y}, ${a.z})`,
  });

  // 元表：支持运算符重载（Luau 侧 `v1 + v2`、`v1 * 2` 等）
  // luau-web 通过 __index 查找 metamethods，需在对象上设置
  // 这里通过 proxy 的 get 捕获 Luau 侧的元方法调用
  return Vector3;
}

/** 创建 CFrame 构造器与静态方法 */
function createCFrame() {
  return Mutable({
    new: (...args) => {
      // 简化：仅支持位置构造
      if (args.length === 3) {
        return { Position: { x: args[0], y: args[1], z: args[2] }, LookVector: { x: 0, y: 0, z: -1 } };
      }
      if (args.length === 1 && args[0].Position) return args[0];
      return { Position: { x: 0, y: 0, z: 0 }, LookVector: { x: 0, y: 0, z: -1 } };
    },
    identity: { Position: { x: 0, y: 0, z: 0 }, LookVector: { x: 0, y: 0, z: -1 } },
    fromMatrix: (pos, right, up, look) => ({ Position: pos, LookVector: look || { x: 0, y: 0, z: -1 } }),
    fromEulerAnglesXYZ: (x, y, z) => ({ Position: { x: 0, y: 0, z: 0 } }), // 简化
    fromEulerAnglesYXZ: (y, x, z) => ({ Position: { x: 0, y: 0, z: 0 } }),
    fromOrientation: (x, y, z) => ({ Position: { x: 0, y: 0, z: 0 } }),
    fromAxisAngle: (axis, angle) => ({ Position: { x: 0, y: 0, z: 0 } }),
    // 元方法：运算符重载
    __mul: (a, b) => {
      if (b.Position && b.LookVector) {
        // CFrame * CFrame (simplified: add positions)
        return {
          Position: {
            x: a.Position.x + b.Position.x,
            y: a.Position.y + b.Position.y,
            z: a.Position.z + b.Position.z
          },
          LookVector: a.LookVector // simplified: keep left's look vector
        };
      }
      if (typeof b === 'object' && b.x !== undefined && b.y !== undefined && b.z !== undefined) {
        // CFrame * Vector3 (simplified: add vector to position)
        return {
          Position: {
            x: a.Position.x + b.x,
            y: a.Position.y + b.y,
            z: a.Position.z + b.z
          },
          LookVector: a.LookVector
        };
      }
      // fallback: return a
      return a;
    },
    __eq: (a, b) => 
      a.Position.x === b.Position.x && a.Position.y === b.Position.y && a.Position.z === b.Position.z &&
      a.LookVector.x === b.LookVector.x && a.LookVector.y === b.LookVector.y && a.LookVector.z === b.LookVector.z,
    __tostring: (a) => 
      `CFrame({Position: {x: ${a.Position.x}, y: ${a.Position.y}, z: ${a.Position.z}}, LookVector: {x: ${a.LookVector.x}, y: ${a.LookVector.y}, z: ${a.LookVector.z}}})`,
  });
}

/** 创建 Color3 */
function createColor3() {
  return Mutable({
    new: (r = 0, g = 0, b = 0) => ({ r, g, b }),
    fromRGB: (r, g, b) => ({ r: r / 255, g: g / 255, b: b / 255 }),
    fromHSV: (h, s, v) => ({ r: 0, g: 0, b: 0 }), // 简化
    toHSV: (color) => ({ h: 0, s: 0, v: 0 }),
    White: { r: 1, g: 1, b: 1 },
    Black: { r: 0, g: 0, b: 0 },
    Red: { r: 1, g: 0, b: 0 },
    Green: { r: 0, g: 1, b: 0 },
    Blue: { r: 0, g: 0, b: 1 },
  });
}

/** 创建 UDim2 */
function createUDim2() {
  return Mutable({
    new: (xScale, xOffset, yScale, yOffset) => ({
      X: { Scale: xScale, Offset: xOffset },
      Y: { Scale: yScale, Offset: yOffset },
    }),
    fromScale: (x, y) => ({ X: { Scale: x, Offset: 0 }, Y: { Scale: y, Offset: 0 } }),
    fromOffset: (x, y) => ({ X: { Scale: 0, Offset: x }, Y: { Scale: 0, Offset: y } }),
  });
}

/** 创建 UDim */
function createUDim() {
  return Mutable({
    new: (scale, offset) => ({ Scale: scale, Offset: offset }),
  });
}

/** 创建 Ray */
function createRay() {
  return Mutable({
    new: (origin, direction) => ({ Origin: origin, Direction: direction }),
  });
}

/** 创建 Rect */
function createRect() {
  return Mutable({
    new: (min, max) => ({ Min: min, Max: max }),
  });
}

// ============================================
// Enum（纯静态表，无状态）
// ============================================

function createEnum() {
  return Mutable({
    Font: { SourceSans: 'SourceSans', GothicSemibold: 'GothicSemibold', Arcade: 'Arcade' },
    TextXAlignment: { Left: 'Left', Center: 'Center', Right: 'Right' },
    TextYAlignment: { Top: 'Top', Center: 'Center', Bottom: 'Bottom' },
    HorizontalAlignment: { Left: 'Left', Center: 'Center', Right: 'Right' },
    VerticalAlignment: { Top: 'Top', Center: 'Center', Bottom: 'Bottom' },
    SizeConstraint: { RelativeXY: 'RelativeXY', RelativeXX: 'RelativeXX', RelativeYY: 'RelativeYY' },
    EasingDirection: { In: 'In', Out: 'Out', InOut: 'InOut' },
    EasingStyle: { Linear: 'Linear', Sine: 'Sine', Back: 'Back', Quad: 'Quad', Quart: 'Quart', Quint: 'Quint', Bounce: 'Bounce', Elastic: 'Elastic', Exponential: 'Exponential', Circular: 'Circular', Cubic: 'Cubic' },
    Material: { Plastic: 'Plastic', Wood: 'Wood', Slate: 'Slate', Concrete: 'Concrete', SmoothPlastic: 'SmoothPlastic', Metal: 'Metal' },
    PartType: { Block: 'Block', Sphere: 'Sphere', Wedge: 'Wedge', Cylinder: 'Cylinder', CornerWedge: 'CornerWedge', Seat: 'Seat', VehicleSeat: 'VehicleSeat', SpawnLocation: 'SpawnLocation' },
    KeyCode: { W: 'W', A: 'A', S: 'S', D: 'D', Space: 'Space', LeftShift: 'LeftShift', LeftControl: 'LeftControl', Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right', E: 'E', Q: 'Q', R: 'R', F: 'F' },
    UserInputState: { Begin: 'Begin', Change: 'Change', End: 'End', Cancel: 'Cancel' },
    RaycastFilterType: { Blacklist: 'Blacklist', Whitelist: 'Whitelist' },
    CollisionGroup: { Default: 'Default' },
  });
}

// ============================================
// task 库（Asyncify 桥接核心）
// ============================================

/**
 * 创建 task 库
 * 关键：所有函数返回 Promise → Luau 侧 Asyncify 自动 await
 * VirtualClock 驱动：task.wait 实际委托给 VirtualClock.wait
 */
function createTaskLibrary(virtualClock) {
  return Mutable({
    wait: async (seconds = 0) => {
      if (!virtualClock) {
        // 降级：真实时间等待（无 QA 模式）
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
      }
      // 委托给虚拟时钟（返回 Promise，Luau 自动 await）
      return virtualClock.wait(seconds);
    },
    spawn: (fn) => {
      // Luau 侧传入函数，JS 侧微任务调度
      queueMicrotask(() => fn());
    },
    delay: async (seconds, fn) => {
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      fn();
    },
    defer: (fn) => queueMicrotask(fn),
    cancel: (thread) => { /* 协程取消在 Luau 侧处理 */ },
    status: (thread) => 'running',
    yield: () => { /* Luau 侧 coroutine.yield */ },
  });
}

// ============================================
// Instance 树系统（核心高频 API）
// ============================================

let instanceIdCounter = 0;
const allInstances = new Map(); // id -> instance

/**
 * 创建 Instance 构造器与基础方法
 * 所有实例对象用 Mutable 包装，支持 Luau 侧属性读写、方法调用
 */
function createInstanceConstructor() {
  // 类方法表（静态）
  const InstanceClass = Mutable({
    new: (className) => createInstance(className),
  });

  return InstanceClass;
}

/** 创建单个实例对象 */
function createInstance(className) {
  const id = ++instanceIdCounter;
  const instance = {
    _id: id,
    Name: className,
    ClassName: className,
    Parent: null,
    Children: [],
    Properties: {},
    Attributes: {},
    Events: {}, // 事件名 -> Set<callback>
    
    // 核心方法
    GetPropertyChangedSignal: (prop) => createSignal(),
    GetAttribute: (name) => instance.Attributes[name],
    SetAttribute: (name, value) => { instance.Attributes[name] = value; },
    GetAttributes: () => ({ ...instance.Attributes }),
    
    FindFirstChild: (name, recursive = false) => {
      for (const child of instance.Children) {
        if (child.Name === name) return child;
        if (recursive) {
          const found = child.FindFirstChild(name, true);
          if (found) return found;
        }
      }
      return null;
    },
    FindFirstChildOfClass: (className) => instance.Children.find(c => c.ClassName === className),
    FindFirstChildWhichIsA: (className) => instance.Children.find(c => c.ClassName === className || c.ClassName === 'Instance'),
    GetChildren: () => [...instance.Children],
    GetDescendants: () => {
      const result = [];
      function recurse(obj) {
        for (const child of obj.Children) {
          result.push(child);
          recurse(child);
        }
      }
      recurse(instance);
      return result;
    },
    IsA: (className) => instance.ClassName === className || className === 'Instance',
    IsAncestorOf: (descendant) => {
      let p = descendant.Parent;
      while (p) { if (p === instance) return true; p = p.Parent; }
      return false;
    },
    IsDescendantOf: (ancestor) => ancestor.IsAncestorOf(instance),
    Destroy: () => {
      if (instance.Parent) {
        const idx = instance.Parent.Children.indexOf(instance);
        if (idx > -1) instance.Parent.Children.splice(idx, 1);
        instance.Parent = null;
      }
      instance.Children.forEach(c => c.Destroy());
      instance.Children = [];
      allInstances.delete(id);
    },
    Clone: () => {
      const clone = createInstance(instance.ClassName);
      Object.assign(clone.Properties, instance.Properties);
      Object.assign(clone.Attributes, instance.Attributes);
      clone.Name = instance.Name;
      // 深拷贝子对象
      for (const child of instance.Children) {
        const clonedChild = child.Clone();
        clonedChild.Parent = clone;
        clone.Children.push(clonedChild);
      }
      return clone;
    },
    ClearAllChildren: () => {
      instance.Children.forEach(c => c.Destroy());
    },
    // 事件系统
    Connect: (eventName, callback) => {
      if (!instance.Events[eventName]) instance.Events[eventName] = new Set();
      instance.Events[eventName].add(callback);
      return { Disconnect: () => { instance.Events[eventName]?.delete(callback); } };
    },
    Once: (eventName, callback) => {
      const wrapper = (...args) => {
        instance.Events[eventName]?.delete(wrapper);
        callback(...args);
      };
      if (!instance.Events[eventName]) instance.Events[eventName] = new Set();
      instance.Events[eventName].add(wrapper);
      return { Disconnect: () => { instance.Events[eventName]?.delete(wrapper); } };
    },
    Fire: (eventName, ...args) => {
      const set = instance.Events[eventName];
      if (set) set.forEach(cb => cb(...args));
    },
    Wait: (eventName) => {
      return new Promise(resolve => {
        const wrapper = (...args) => {
          instance.Events[eventName]?.delete(wrapper);
          resolve(args);
        };
        if (!instance.Events[eventName]) instance.Events[eventName] = new Set();
        instance.Events[eventName].add(wrapper);
      });
    },
    // 元方法：属性访问优先级
    __index: (self, key) => {
      // 排除内部字段
      const internalFields = ['_id', 'Name', 'ClassName', 'Parent', 'Children', 'Properties', 'Attributes', 'Events',
        'GetPropertyChangedSignal', 'GetAttribute', 'SetAttribute', 'GetAttributes',
        'FindFirstChild', 'FindFirstChildOfClass', 'FindFirstChildWhichIsA', 'GetChildren', 'GetDescendants',
        'IsA', 'IsAncestorOf', 'IsDescendantOf', 'Destroy', 'Clone', 'ClearAllChildren',
        'Connect', 'Once', 'Fire', 'Wait'];
      if (!internalFields.includes(key) && Object.prototype.hasOwnProperty.call(self, key)) {
        return self[key];
      }
      // 检查 Properties 表
      if (Object.prototype.hasOwnProperty.call(self.Properties, key)) {
        return self.Properties[key];
      }
      // 未找到返回 undefined
      return undefined;
    },
    __newindex: (self, key, value) => {
      const internalFields = ['_id', 'Name', 'ClassName', 'Parent', 'Children', 'Properties', 'Attributes', 'Events',
        'GetPropertyChangedSignal', 'GetAttribute', 'SetAttribute', 'GetAttributes',
        'FindFirstChild', 'FindFirstChildOfClass', 'FindFirstChildWhichIsA', 'GetChildren', 'GetDescendants',
        'IsA', 'IsAncestorOf', 'IsDescendantOf', 'Destroy', 'Clone', 'ClearAllChildren',
        'Connect', 'Once', 'Fire', 'Wait'];
      if (!internalFields.includes(key)) {
        // 非内部字段，存入 Properties 表
        self.Properties[key] = value;
      }
      // 内部字段直接设置（虽然通常不会通过 __newindex 设置，但为了完整性）
      // 实际上 Luau 设置内部字段会走自身属性设置，这里我们允许直接设置
      self[key] = value;
    }
  };

  allInstances.set(id, instance);
  return Mutable(instance);
}

/** 创建信号对象（RBXScriptSignal 语义） */
function createSignal() {
  const callbacks = new Set();
  return Mutable({
    Connect: (callback) => {
      callbacks.add(callback);
      return Mutable({ Disconnect: () => callbacks.delete(callback) });
    },
    Once: (callback) => {
      const wrapper = (...args) => { callbacks.delete(wrapper); callback(...args); };
      callbacks.add(wrapper);
      return Mutable({ Disconnect: () => callbacks.delete(wrapper) });
    },
    Wait: () => new Promise(resolve => {
      const wrapper = (...args) => { callbacks.delete(wrapper); resolve(args); };
      callbacks.add(wrapper);
    }),
    Fire: (...args) => callbacks.forEach(cb => cb(...args)),
  });
}

// ============================================
// 核心服务存根（JS 侧存根，委托 Luau 侧 ModuleScript）
// ============================================

/** 创建 RunService（事件总线 + VirtualClock 驱动） */
function createRunService(virtualClock) {
  const listeners = { Heartbeat: [], Stepped: [], RenderStepped: [], PreSimulation: [], PostSimulation: [] };
  
  function createEvent(name) {
    return Mutable({
      Connect: (callback) => {
        listeners[name].push(callback);
        return Mutable({ Disconnect: () => {
          const idx = listeners[name].indexOf(callback);
          if (idx > -1) listeners[name].splice(idx, 1);
        }});
      },
    });
  }

  // VirtualClock 推进时触发
  function fireFrame(dt) {
    listeners.Heartbeat.forEach(cb => cb(dt));
    listeners.Stepped.forEach(cb => cb(dt));
    listeners.RenderStepped.forEach(cb => cb(dt));
  }

  return Mutable({
    Name: 'RunService',
    ClassName: 'RunService',
    Heartbeat: createEvent('Heartbeat'),
    Stepped: createEvent('Stepped'),
    RenderStepped: createEvent('RenderStepped'),
    PreSimulation: createEvent('PreSimulation'),
    PostSimulation: createEvent('PostSimulation'),
    IsClient: () => true,
    IsServer: () => false,
    IsRunning: () => true,
    Set3dRenderingEnabled: (enabled) => {},
    _internal: { fireFrame, listeners }, // 供 VirtualClock 调用
  });
}

/** 创建 DataStoreService（存根，实际实现在 Luau 侧 ModuleScript） */
function createDataStoreService() {
  const stores = new Map();
  return Mutable({
    Name: 'DataStoreService',
    ClassName: 'DataStoreService',
    GetDataStore: (name, scope = 'global') => {
      const key = `${scope}/${name}`;
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key);
      return Mutable({
        Name: name,
        Scope: scope,
        GetAsync: async (key) => store.get(key) ?? null,
        SetAsync: async (key, value) => { store.set(key, value); },
        UpdateAsync: async (key, fn) => { const old = store.get(key); const newVal = fn(old); store.set(key, newVal); return newVal; },
        RemoveAsync: async (key) => { store.delete(key); },
        IncrementAsync: async (key, delta) => { const old = store.get(key) || 0; const newVal = old + delta; store.set(key, newVal); return newVal; },
        GetSortedAsync: () => Mutable({ GetCurrentPage: () => [] }),
      });
    },
  });
}

/** 创建 CollectionService */
function createCollectionService() {
  const tags = new Map(); // tag -> Set<instance>
  return Mutable({
    Name: 'CollectionService',
    ClassName: 'CollectionService',
    AddTag: (instance, tag) => { if (!tags.has(tag)) tags.set(tag, new Set()); tags.get(tag).add(instance); },
    RemoveTag: (instance, tag) => tags.get(tag)?.delete(instance),
    HasTag: (instance, tag) => tags.get(tag)?.has(instance) ?? false,
    GetTags: (instance) => [...tags.entries()].filter(([_, set]) => set.has(instance)).map(([tag]) => tag),
    GetTagged: (tag) => [...(tags.get(tag) ?? [])],
  });
}

/** 创建 TweenService */
function createTweenService() {
  return Mutable({
    Name: 'TweenService',
    ClassName: 'TweenService',
    Create: (object, tweenInfo, properties) => Mutable({
      Play: () => {},
      Pause: () => {},
      Cancel: () => {},
      Completed: createSignal(),
    }),
  });
}

/** 创建 PhysicsService */
function createPhysicsService() {
  return Mutable({
    Name: 'PhysicsService',
    ClassName: 'PhysicsService',
    RegisterCollisionGroup: (name) => {},
    CollisionGroupSetCollidable: (group1, group2, collidable) => {},
    GetCollisionGroupId: (name) => 0,
    GetCollisionGroupName: (id) => 'Default',
    SetPartCollisionGroup: (part, group) => {},
  });
}

/** 创建 HttpService */
function createHttpService() {
  return Mutable({
    Name: 'HttpService',
    ClassName: 'HttpService',
    JSONEncode: (obj) => JSON.stringify(obj),
    JSONDecode: (str) => JSON.parse(str),
    GenerateGUID: () => crypto.randomUUID(),
    UrlEncode: (str) => encodeURIComponent(str),
    RequestAsync: async () => ({ Success: false, StatusCode: 403, Body: 'HttpRequest not enabled in sandbox' }),
  });
}

/** 创建 Players 服务 */
function createPlayersService() {
  return Mutable({
    Name: 'Players',
    ClassName: 'Players',
    LocalPlayer: Mutable({
      Name: 'Player1',
      UserId: 1,
      Character: null,
      PlayerGui: Mutable({ Name: 'PlayerGui' }),
      PlayerScripts: Mutable({ Name: 'PlayerScripts' }),
      Backpack: Mutable({ Name: 'Backpack' }),
      GetMouse: () => Mutable({ Hit: createCFrame().new(), Target: null }),
    }),
    MaxPlayers: 100,
    GetPlayers: () => [],
    PlayerAdded: createSignal(),
    PlayerRemoving: createSignal(),
  });
}

/** 创建 Workspace 服务 */
function createWorkspace() {
  const children = [];
  return Mutable({
    Name: 'Workspace',
    ClassName: 'Workspace',
    Parent: null,
    Children: children,
    Gravity: 196.2,
    CurrentCamera: Mutable({ CFrame: createCFrame().new() }),
    AddChild: (child) => { children.push(child); child.Parent = workspace; },
    RemoveChild: (child) => { const i = children.indexOf(child); if (i > -1) children.splice(i, 1); },
    FindFirstChild: (name) => children.find(c => c.Name === name),
    GetChildren: () => [...children],
    GetDescendants: () => [...children],
    Raycast: () => null,
    GetServerTimeNow: () => Date.now() / 1000,
  });
}

/** 创建 ReplicatedStorage */
function createReplicatedStorage() {
  return Mutable({
    Name: 'ReplicatedStorage',
    ClassName: 'ReplicatedStorage',
    Children: [],
    AddChild: (child) => { this.Children.push(child); child.Parent = this; },
  });
}

/** 创建 UserInputService */
function createUserInputService() {
  return Mutable({
    Name: 'UserInputService',
    ClassName: 'UserInputService',
    InputBegan: createSignal(),
    InputChanged: createSignal(),
    InputEnded: createSignal(),
    GetMouseLocation: () => ({ x: 0, y: 0 }),
    MouseBehavior: 'Default',
  });
}

// ============================================
// 打印/调试/基础库
// ============================================

function createPrintFunction() {
  return (...args) => {
    const output = args.map(a => String(a)).join('\t');
    console.log('[Lua]', output);
    window.dispatchEvent(new CustomEvent('lua-print', { detail: output }));
  };
}

function createWarnFunction() {
  return (...args) => {
    const output = args.map(a => String(a)).join('\t');
    console.warn('[Lua]', output);
    window.dispatchEvent(new CustomEvent('lua-warn', { detail: output }));
  };
}

function createErrorFunction() {
  return (msg) => { throw new Error(msg); };
}

function createTypeFunction() {
  return (v) => typeof v === 'object' ? 'table' : typeof v;
}

function createTypeofFunction() {
  return (v) => {
    if (v === null) return 'nil';
    if (Array.isArray(v)) return 'table';
    if (typeof v === 'object') return v.ClassName || 'table';
    return typeof v;
  };
}

function createAssertFunction() {
  return (condition, msg) => { if (!condition) throw new Error(msg || 'assertion failed!'); return condition; };
}

function createRequireFunction() {
  const modules = new Map();
  return (name) => {
    if (modules.has(name)) return modules.get(name);
    const mod = {};
    modules.set(name, mod);
    return mod;
  };
}

function createMathLibrary() {
  return Mutable({
    ...Math,
    clamp: (x, min, max) => Math.max(min, Math.min(max, x)),
    lerp: (a, b, t) => a + (b - a) * t,
    sign: (x) => x > 0 ? 1 : x < 0 ? -1 : 0,
    round: (x) => Math.round(x),
    noiseless: () => Math.random(),
    random: (a, b) => { if (b === undefined) return Math.random() * a; if (a === undefined) return Math.random(); return a + Math.random() * (b - a); },
  });
}

function createDebugLibrary() {
  return Mutable({
    traceback: () => 'stack traceback',
    profilebegin: () => {},
    profileend: () => {},
  });
}

// ============================================
// 主导出：创建完整的 Roblox 全局环境
// ============================================

/**
 * 创建注入 Luau 状态的完整全局环境
 * @param {Object} engine - LuaEngine 实例（用于 globalsSet 等）
 * @param {Object} virtualClock - VirtualClock 代理（可选，QA 模式）
 * @returns {Object} { globals, services, registerLuauServices }
 */
export function createRobloxGlobals(engine, virtualClock = null) {
  // 基础类型
  const Vector3 = createVector3();
  const CFrame = createCFrame();
  const Color3 = createColor3();
  const UDim2 = createUDim2();
  const UDim = createUDim();
  const Ray = createRay();
  const Rect = createRect();
  const Enum = createEnum();
  
  // task 库（需虚拟时钟）
  const task = createTaskLibrary(virtualClock);
  
  // Instance 构造器
  const Instance = createInstanceConstructor();
  
  // 核心服务
  const RunService = createRunService(virtualClock);
  const DataStoreService = createDataStoreService();
  const CollectionService = createCollectionService();
  const TweenService = createTweenService();
  const PhysicsService = createPhysicsService();
  const HttpService = createHttpService();
  const Players = createPlayersService();
  const Workspace = createWorkspace();
  const ReplicatedStorage = createReplicatedStorage();
  const UserInputService = createUserInputService();
  
  // 基础库
  const math = createMathLibrary();
  const debug = createDebugLibrary();
  
  // 全局函数
  const print = createPrintFunction();
  const warn = createWarnFunction();
  const error = createErrorFunction();
  const type = createTypeFunction();
  const typeof_ = createTypeofFunction(); // typeof 是保留字
  const assert = createAssertFunction();
  const require = createRequireFunction();
  
  // script 对象
  const script = Mutable({ Name: 'Script', ClassName: 'Script', Source: '', Enabled: true, RunContext: 'Legacy' });
  
  // 组装 globals
  const globals = Mutable({
    Vector3, CFrame, Color3, UDim2, UDim, Ray, Rect, Enum,
    Instance, task,
    game: Mutable({ GetService: (name) => services[name] || Mutable({ Name: name }) }),
    workspace: Workspace,
    Players, ReplicatedStorage,
    RunService, DataStoreService, CollectionService, TweenService, PhysicsService, HttpService, UserInputService,
    math, debug,
    print, warn, error, type, typeof: typeof_, assert, require,
    script, plugin: null, _G: Mutable({}), shared: Mutable({}),
    version: '0.1.0 (Luau WASM)',
    _VERSION: 'Luau 5.1 (luau-web)',
  });
  
  // 服务表（供 game:GetService 访问）
  const services = {
    RunService, DataStoreService, CollectionService, TweenService, PhysicsService, HttpService,
    Players, Workspace, ReplicatedStorage, UserInputService,
    // 其他服务存根
    ServerStorage: Mutable({ Name: 'ServerStorage', ClassName: 'ServerStorage', Children: [] }),
    StarterGui: Mutable({ Name: 'StarterGui', ClassName: 'StarterGui' }),
    StarterPack: Mutable({ Name: 'StarterPack', ClassName: 'StarterPack' }),
    StarterPlayer: Mutable({ Name: 'StarterPlayer', ClassName: 'StarterPlayer' }),
    Lighting: Mutable({ Name: 'Lighting', ClassName: 'Lighting', Ambient: Color3.new(0,0,0), Brightness: 2, ClockTime: 14 }),
    SoundService: Mutable({ Name: 'SoundService', ClassName: 'SoundService', RespectFilteringEnabled: true }),
    GuiService: Mutable({ Name: 'GuiService', ClassName: 'GuiService', AutoSelectGuiEnabled: false }),
    MarketplaceService: Mutable({ Name: 'MarketplaceService', ClassName: 'MarketplaceService' }),
    TeleportService: Mutable({ Name: 'TeleportService', ClassName: 'TeleportService' }),
    Chat: Mutable({ Name: 'Chat', ClassName: 'Chat' }),
    TextService: Mutable({ Name: 'TextService', ClassName: 'TextService' }),
    LocalizationService: Mutable({ Name: 'LocalizationService', ClassName: 'LocalizationService' }),
    PathfindingService: Mutable({ Name: 'PathfindingService', ClassName: 'PathfindingService' }),
    AssetService: Mutable({ Name: 'AssetService', ClassName: 'AssetService' }),
    InsertService: Mutable({ Name: 'InsertService', ClassName: 'InsertService' }),
    PointsService: Mutable({ Name: 'PointsService', ClassName: 'PointsService' }),
    BadgeService: Mutable({ Name: 'BadgeService', ClassName: 'BadgeService' }),
    GamePassService: Mutable({ Name: 'GamePassService', ClassName: 'GamePassService' }),
    AnalyticsService: Mutable({ Name: 'AnalyticsService', ClassName: 'AnalyticsService', ReportInfluxSeries: () => {} }),
    AdService: Mutable({ Name: 'AdService', ClassName: 'AdService' }),
    SocialService: Mutable({ Name: 'SocialService', ClassName: 'SocialService' }),
    VoiceChatService: Mutable({ Name: 'VoiceChatService', ClassName: 'VoiceChatService' }),
    CaptureService: Mutable({ Name: 'CaptureService', ClassName: 'CaptureService' }),
    CoreGui: Mutable({ Name: 'CoreGui', ClassName: 'CoreGui', Enabled: true }),
    ProximityPromptService: Mutable({ Name: 'ProximityPromptService', ClassName: 'ProximityPromptService' }),
    ContextActionService: Mutable({ Name: 'ContextActionService', ClassName: 'ContextActionService', BindAction: () => {}, UnbindAction: () => {} }),
  };
  
  // 注入到引擎主状态
  Object.entries(globals).forEach(([key, value]) => {
    engine.globalsSet(key, value);
  });
  
  // 返回注册 Luau 侧服务的函数（供后续加载 ModuleScript 时调用）
  function registerLuauServices(luauState) {
    // 将 Luau 侧 ModuleScript 实现的服务注入到对应的全局
    // 例如：DataStoreService 的 Luau 实现会替换 JS 存根的某些方法
  }
  
  return { globals, services, registerLuauServices };
}

// ============================================
// Luau 侧预置 ModuleScript 代码模板（字符串常量）
// 实际部署时写入虚拟文件系统或 ReplicatedStorage
// ============================================

export const LUAU_SERVICE_MODULES = {
  // DataStore Luau 实现（替换 JS 存根）
  DataStore: `
local DataStoreService = game:GetService("DataStoreService")
local DataStore = {}
DataStore.__index = DataStore

function DataStore.new(name, scope)
  local self = setmetatable({}, DataStore)
  self._store = DataStoreService:GetDataStore(name, scope)
  return self
end

function DataStore:GetAsync(key)
  return self._store:GetAsync(key)
end

function DataStore:SetAsync(key, value)
  return self._store:SetAsync(key, value)
end

function DataStore:UpdateAsync(key, transformFn)
  return self._store:UpdateAsync(key, transformFn)
end

return DataStore
`,
  
  // TweenService Luau 实现
  TweenService: `
local TweenService = game:GetService("TweenService")
-- Luau 侧可扩展更复杂的补间逻辑
return TweenService
`,
  
  // CollectionService Luau 实现
  CollectionService: `
local CollectionService = game:GetService("CollectionService")
return CollectionService
`,
};

export default createRobloxGlobals;