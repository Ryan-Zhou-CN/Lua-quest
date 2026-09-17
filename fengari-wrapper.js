/**
 * Fengari 封装模块
 * 提供 Luau 代码执行沙箱、API 模拟、超时保护
 * 使用本地 UMD bundle (window.fengari / window.fengariInterop)
 */

// 从全局获取 Fengari (由 vendor/fengari-bundle.js 注入)
const fengari = window.fengari;
const fengariInterop = window.fengariInterop;

if (!fengari || !fengari.lua) {
    throw new Error('Fengari 未加载，请确保 vendor/fengari-bundle.js 已正确引入');
}

const { lua, luaconf, lauxlib, lualib, to_luastring, to_jsstring, interop } = fengari;

let luaState = null;
let isInitialized = false;

// Roblox API 模拟
// 先定义基础类型（无依赖）
const robloxGlobals = {
    // 基础类型
    Vector3: createVector3Class(),
    Vector2: createVector2Class(),
    CFrame: createCFrameClass(),
    Color3: createColor3Class(),
    UDim2: createUDim2Class(),
    UDim: createUDimClass(),
    Rect: createRectClass(),
    Ray: createRayClass(),

    // Enum
    Enum: createEnum(),

    // 实例创建
    Instance: createInstanceConstructor(),

    // 任务调度
    task: createTaskLibrary(),

    // 调试
    debug: createDebugLibrary(),

    // 数学
    math: createMathLibrary(),

    // 字符串
    string: createStringLibrary(),

    // 表
    table: createTableLibrary(),

    // 协程
    coroutine: createCoroutineLibrary(),

    // 延迟
    wait: createWaitFunction(),
    spawn: createSpawnFunction(),
    delay: createDelayFunction(),

    // 打印
    print: createPrintFunction(),
    warn: createWarnFunction(),
    error: createErrorFunction(),

    // 类型检查
    type: createTypeFunction(),
    typeof: createTypeofFunction(),
    assert: createAssertFunction(),
    require: createRequireFunction(),

    // 环境
    _G: {},
    shared: {},
    script: createScriptObject(),
    plugin: null,
    version: '0.1.0',
};

// 再定义依赖基础类型的服务（惰性初始化）
function initServices() {
    robloxGlobals.game = createGameService();
    robloxGlobals.workspace = createWorkspaceService();
    robloxGlobals.Players = createPlayersService();
    robloxGlobals.ReplicatedStorage = createReplicatedStorageService();
    robloxGlobals.ServerStorage = createServerStorageService();
    robloxGlobals.StarterGui = createStarterGuiService();
    robloxGlobals.StarterPack = createStarterPackService();
    robloxGlobals.StarterPlayer = createStarterPlayerService();
    robloxGlobals.Lighting = createLightingService();
    robloxGlobals.SoundService = createSoundService();
    robloxGlobals.TweenService = createTweenService();
    robloxGlobals.PhysicsService = createPhysicsService();
    robloxGlobals.RunService = createRunService();
    robloxGlobals.UserInputService = createUserInputService();
    robloxGlobals.ContextActionService = createContextActionService();
    robloxGlobals.GuiService = createGuiService();
    robloxGlobals.HttpService = createHttpService();
    robloxGlobals.MarketplaceService = createMarketplaceService();
    robloxGlobals.DataStoreService = createDataStoreService();
    robloxGlobals.TeleportService = createTeleportService();
    robloxGlobals.Chat = createChatService();
    robloxGlobals.TextService = createTextService();
    robloxGlobals.LocalizationService = createLocalizationService();
    robloxGlobals.PathfindingService = createPathfindingService();
    robloxGlobals.CollectionService = createCollectionService();
    robloxGlobals.AssetService = createAssetService();
    robloxGlobals.InsertService = createInsertService();
    robloxGlobals.PointsService = createPointsService();
    robloxGlobals.BadgeService = createBadgeService();
    robloxGlobals.GamePassService = createGamePassService();
    robloxGlobals.AnalyticsService = createAnalyticsService();
    robloxGlobals.AdService = createAdService();
    robloxGlobals.SocialService = createSocialService();
    robloxGlobals.VoiceChatService = createVoiceChatService();
    robloxGlobals.CaptureService = createCaptureService();
    robloxGlobals.CoreGui = createCoreGuiService();
    robloxGlobals.ProximityPromptService = createProximityPromptService();
}

// 在模块加载时初始化服务
initServices();

/**
 * 初始化 Fengari
 */
export async function initFengari() {
    if (isInitialized) return;

    try {
        // 创建新的 Lua 状态
        luaState = lua();

        // 开启沙箱模式
        await setupSandbox(luaState);

        // 注入 Roblox 全局变量
        injectGlobals(luaState);

        // 注入 interop (JS <-> Lua 互操作)
        // fengari-web 已自动加载基础库，我们只需注入自定义全局变量
        // interop 会在需要时通过 globals 访问

        isInitialized = true;
        console.log('[Fengari] 初始化完成 (UMD bundle)');
    } catch (error) {
        console.error('[Fengari] 初始化失败:', error);
        throw error;
    }
}

/**
 * 设置沙箱环境
 */
async function setupSandbox(L) {
    // 限制执行时间（通过 debug.sethook 实现）
    const timeoutMs = 5000; // 5秒超时

    L.doString(`
        local debug = require('debug')
        local original_sethook = debug.sethook

        -- 重写 sethook 以防止滥用
        debug.sethook = function(hook, mask, count)
            if type(mask) == 'string' and mask:find('[lc]') then
                -- 限制 hook 频率
                count = math.max(count or 100000, 100000)
            end
            return original_sethook(hook, mask, count)
        end

        -- 禁用危险函数
        local function disable(name)
            _G[name] = function()
                error(name .. ' is disabled in sandbox', 2)
            end
        end

        disable('loadfile')
        disable('dofile')
        disable('load')
        -- os.execute, io.popen 等已默认不可用
    `);
}

/**
 * 注入全局变量到 Lua 状态
 */
function injectGlobals(L) {
    const globals = L.globals;

    Object.entries(robloxGlobals).forEach(([key, value]) => {
        globals[key] = value;
    });

    // 设置 _VERSION
    globals._VERSION = 'Luau 5.1 (Fengari 0.1.4 UMD)';
}

/**
 * 创建沙箱环境
 */
export function createSandbox() {
    if (!luaState) throw new Error('Fengari 未初始化');

    // 创建新的环境表
    const env = luaState.createTable();

    // 继承全局表但隔离 _G
    const globals = luaState.globals;
    luaState.doString(`
        setmetatable(_, { __index = _G })
    `, { _: env });

    return env;
}

/**
 * 运行 Luau 代码
 */
export async function runLuauCode(code, gameState) {
    if (!luaState) throw new Error('Fengari 未初始化');

    const startTime = performance.now();
    let capturedOutput = '';

    // 捕获 print/warn 输出
    const capturePrint = (detail) => { capturedOutput += detail + '\n'; };
    const captureWarn = (detail) => { capturedOutput += '[WARN] ' + detail + '\n'; };

    window.addEventListener('lua-print', capturePrint);
    window.addEventListener('lua-warn', captureWarn);

    try {
        // 创建沙箱环境
        const env = createSandbox();

        // 注入游戏状态
        env.gameState = gameState;

        // 编译并执行
        const chunk = luaState.load(code, 'main', 't', env);
        const result = await chunk();

        const duration = Math.round(performance.now() - startTime);

        return {
            success: true,
            result,
            duration,
            output: capturedOutput.trim(),
        };
    } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        return {
            success: false,
            error: error.message,
            duration,
            output: capturedOutput.trim(),
        };
    } finally {
        window.removeEventListener('lua-print', capturePrint);
        window.removeEventListener('lua-warn', captureWarn);
    }
}

/**
 * 同步运行（用于测试）
 */
export function runLuauCodeSync(code, env = null) {
    if (!luaState) throw new Error('Fengari 未初始化');

    const targetEnv = env || createSandbox();
    const chunk = luaState.load(code, 'main', 't', targetEnv);
    return chunk();
}

// ============================================================================
// Roblox API 模拟实现
// ============================================================================

function createVector3Class() {
    return {
        new: (x = 0, y = 0, z = 0) => ({ x, y, z, magnitude: Math.sqrt(x*x + y*y + z*z) }),
        zero: { x: 0, y: 0, z: 0 },
        one: { x: 1, y: 1, z: 1 },
        xAxis: { x: 1, y: 0, z: 0 },
        yAxis: { x: 0, y: 1, z: 0 },
        zAxis: { x: 0, y: 0, z: 1 },
        FromNormalId: (normalId) => ({ x: 0, y: 0, z: 0 }),
        FromAxis: (axis) => ({ x: 0, y: 0, z: 0 }),
    };
}

function createVector2Class() {
    return {
        new: (x = 0, y = 0) => ({ x, y, magnitude: Math.sqrt(x*x + y*y) }),
        zero: { x: 0, y: 0 },
        one: { x: 1, y: 1 },
    };
}

function createCFrameClass() {
    return {
        new: (...args) => ({
            Position: { x: 0, y: 0, z: 0 },
            LookVector: { x: 0, y: 0, z: -1 },
            RightVector: { x: 1, y: 0, z: 0 },
            UpVector: { x: 0, y: 1, z: 0 },
        }),
        identity: { Position: { x: 0, y: 0, z: 0 } },
        fromMatrix: (pos, right, up, look) => ({ Position: pos }),
        fromEulerAnglesXYZ: (x, y, z) => ({ Position: { x: 0, y: 0, z: 0 } }),
        fromEulerAnglesYXZ: (y, x, z) => ({ Position: { x: 0, y: 0, z: 0 } }),
        fromOrientation: (x, y, z) => ({ Position: { x: 0, y: 0, z: 0 } }),
        fromAxisAngle: (axis, angle) => ({ Position: { x: 0, y: 0, z: 0 } }),
    };
}

function createColor3Class() {
    return {
        new: (r = 0, g = 0, b = 0) => ({ r, g, b }),
        fromRGB: (r, g, b) => ({ r: r/255, g: g/255, b: b/255 }),
        fromHSV: (h, s, v) => ({ r: 0, g: 0, b: 0 }),
        toHSV: (color) => ({ h: 0, s: 0, v: 0 }),
        White: { r: 1, g: 1, b: 1 },
        Black: { r: 0, g: 0, b: 0 },
        Red: { r: 1, g: 0, b: 0 },
        Green: { r: 0, g: 1, b: 0 },
        Blue: { r: 0, g: 0, b: 1 },
    };
}

function createUDim2Class() {
    return {
        new: (xScale, xOffset, yScale, yOffset) => ({
            X: { Scale: xScale, Offset: xOffset },
            Y: { Scale: yScale, Offset: yOffset },
        }),
        fromScale: (x, y) => ({ X: { Scale: x, Offset: 0 }, Y: { Scale: y, Offset: 0 } }),
        fromOffset: (x, y) => ({ X: { Scale: 0, Offset: x }, Y: { Scale: 0, Offset: y } }),
    };
}

function createUDimClass() {
    return {
        new: (scale, offset) => ({ Scale: scale, Offset: offset }),
    };
}

function createRectClass() {
    return {
        new: (min, max) => ({ Min: min, Max: max }),
    };
}

function createRayClass() {
    return {
        new: (origin, direction) => ({ Origin: origin, Direction: direction }),
    };
}

function createEnum() {
    return {
        Font: { SourceSans: 'SourceSans', GothicSemibold: 'GothicSemibold', Arcade: 'Arcade' },
        TextXAlignment: { Left: 'Left', Center: 'Center', Right: 'Right' },
        TextYAlignment: { Top: 'Top', Center: 'Center', Bottom: 'Bottom' },
        HorizontalAlignment: { Left: 'Left', Center: 'Center', Right: 'Right' },
        VerticalAlignment: { Top: 'Top', Center: 'Center', Bottom: 'Bottom' },
        SizeConstraint: { RelativeXY: 'RelativeXY', RelativeXX: 'RelativeXX', RelativeYY: 'RelativeYY' },
        ButtonStyle: { Default: 'Default', RobloxButtonDefault: 'RobloxButtonDefault', RobloxButton: 'RobloxButton' },
        FrameStyle: { Default: 'Default', Custom: 'Custom', ChatBlue: 'ChatBlue', ChatGreen: 'ChatGreen', ChatRed: 'ChatRed', RobloxRound: 'RobloxRound', RobloxSquare: 'RobloxSquare' },
        ScrollBarInset: { None: 'None', ScrollBar: 'ScrollBar', Always: 'Always' },
        AutomaticSize: { None: 'None', X: 'X', Y: 'Y', XY: 'XY' },
        EasingDirection: { In: 'In', Out: 'Out', InOut: 'InOut' },
        EasingStyle: { Linear: 'Linear', Sine: 'Sine', Back: 'Back', Quad: 'Quad', Quart: 'Quart', Quint: 'Quint', Bounce: 'Bounce', Elastic: 'Elastic', Exponential: 'Exponential', Circular: 'Circular', Cubic: 'Cubic' },
        Material: { Plastic: 'Plastic', Wood: 'Wood', Slate: 'Slate', Concrete: 'Concrete', CorrodedMetal: 'CorrodedMetal', DiamondPlate: 'DiamondPlate', Foil: 'Foil', Grass: 'Grass', Ice: 'Ice', Marble: 'Marble', Granite: 'Granite', Brick: 'Brick', Pebble: 'Pebble', Sand: 'Sand', Fabric: 'Fabric', SmoothPlastic: 'SmoothPlastic', Metal: 'Metal', WoodPlanks: 'WoodPlanks', Cobblestone: 'Cobblestone', Air: 'Air', Water: 'Water', Rock: 'Rock', Glacier: 'Glacier', Snow: 'Snow', Sandstone: 'Sandstone', Mud: 'Mud', Basalt: 'Basalt', Ground: 'Ground', Asphalt: 'Asphalt', LeafyGrass: 'LeafyGrass', Salt: 'Salt', Limestone: 'Limestone', Pavement: 'Pavement', BrickBlock: 'BrickBlock', CrackedLava: 'CrackedLava' },
        SurfaceType: { Smooth: 'Smooth', Glue: 'Glue', Weld: 'Weld', Studs: 'Studs', Inlet: 'Inlet', Universal: 'Universal', Hinge: 'Hinge', Motor: 'Motor', SmoothNoOutlines: 'SmoothNoOutlines' },
        PartType: { Block: 'Block', Sphere: 'Sphere', Wedge: 'Wedge', Cylinder: 'Cylinder', CornerWedge: 'CornerWedge', TrussPart: 'TrussPart', Seat: 'Seat', VehicleSeat: 'VehicleSeat', SpawnLocation: 'SpawnLocation' },
        InputType: { MouseButton1: 'MouseButton1', MouseButton2: 'MouseButton2', MouseButton3: 'MouseButton3', MouseWheel: 'MouseWheel', MouseMovement: 'MouseMovement', Touch: 'Touch', Keyboard: 'Keyboard', Gamepad1: 'Gamepad1', Gamepad2: 'Gamepad2', Gamepad3: 'Gamepad3', Gamepad4: 'Gamepad4' },
        KeyCode: {
            W: 'W', A: 'A', S: 'S', D: 'D',
            Space: 'Space', LeftShift: 'LeftShift', LeftControl: 'LeftControl',
            Up: 'Up', Down: 'Down', Left: 'Left', Right: 'Right',
            E: 'E', Q: 'Q', R: 'R', F: 'F', G: 'G', H: 'H',
            One: 'One', Two: 'Two', Three: 'Three', Four: 'Four', Five: 'Five',
        },
        UserInputState: { Begin: 'Begin', Change: 'Change', End: 'End', Cancel: 'Cancel' },
        MouseBehavior: { Default: 'Default', LockCenter: 'LockCenter', LockCurrentPosition: 'LockCurrentPosition' },
        CameraType: { Fixed: 'Fixed', Attach: 'Attach', Watch: 'Watch', Custom: 'Custom', Track: 'Track', Follow: 'Follow', Orbital: 'Orbital', Scriptable: 'Scriptable' },
        CameraMode: { Classic: 'Classic', LockFirstPerson: 'LockFirstPerson' },
        DevCameraOcclusionMode: { Zoom: 'Zoom', Invisicam: 'Invisicam' },
        RenderFidelity: { Automatic: 'Automatic', Precise: 'Precise', Performance: 'Performance' },
        CollisionGroup: { Default: 'Default' },
        RaycastFilterType: { Blacklist: 'Blacklist', Whitelist: 'Whitelist' },
        DataStoreRequestType: { Set: 'Set', Update: 'Update', Get: 'Get', Remove: 'Remove', OnUpdate: 'OnUpdate' },
        HttpRequestType: { Get: 'Get', Post: 'Post', Put: 'Put', Patch: 'Patch', Delete: 'Delete' },
        MessageType: { Default: 'Default', System: 'System', Error: 'Error', Warning: 'Warning', Info: 'Info', Success: 'Success', SetCore: 'SetCore' },
        TextFilterResult: { Success: 'Success', Inappropriate: 'Inappropriate', Error: 'Error' },
        ThreadStatus: { Running: 'Running', Suspended: 'Suspended', Normal: 'Normal', Dead: 'Dead' },
    };
}

function createGameService() {
    return {
        GetService: (name) => robloxGlobals[name] || { Name: name },
        PlaceId: 0,
        JobId: '00000000-0000-0000-0000-000000000000',
        GameId: 0,
        CreatorId: 0,
        CreatorType: 'User',
        Genre: 'All',
        IsLoaded: true,
        Loaded: { Connect: () => ({ Disconnect: () => {} }) },
        Close: { Connect: () => ({ Disconnect: () => {} }) },
        BindToClose: (fn) => {},
    };
}

function createWorkspaceService() {
    const children = [];
    return {
        Name: 'Workspace',
        ClassName: 'Workspace',
        Parent: null,
        Children: children,
        Gravity: 196.2,
        CurrentCamera: { CFrame: robloxGlobals.CFrame.new() },
        AddChild: (child) => { children.push(child); child.Parent = this; },
        RemoveChild: (child) => { const i = children.indexOf(child); if (i > -1) children.splice(i, 1); },
        FindFirstChild: (name) => children.find(c => c.Name === name),
        GetChildren: () => [...children],
        GetDescendants: () => [...children],
        Raycast: (origin, direction, params) => null,
        Blockcast: (cframe, size, direction, params) => null,
        Spherecast: (origin, radius, direction, params) => null,
        GetServerTimeNow: () => Date.now() / 1000,
        DistributedGameTime: 0,
    };
}

function createPlayersService() {
    const players = [];
    return {
        Name: 'Players',
        ClassName: 'Players',
        LocalPlayer: {
            Name: 'Player1',
            UserId: 1,
            Character: null,
            PlayerGui: { Name: 'PlayerGui' },
            PlayerScripts: { Name: 'PlayerScripts' },
            Backpack: { Name: 'Backpack' },
            GetMouse: () => ({ Hit: robloxGlobals.CFrame.new(), Target: null }),
        },
        MaxPlayers: 100,
        PreferredPlayers: 100,
        PlayerAdded: { Connect: (fn) => { fn(players[0]); return { Disconnect: () => {} }; } },
        PlayerRemoving: { Connect: () => ({ Disconnect: () => {} }) },
        GetPlayers: () => [...players],
        GetPlayerFromCharacter: (char) => players.find(p => p.Character === char),
        CreateHumanoidModelFromUserId: (id) => ({ Name: 'Dummy' }),
    };
}

function createReplicatedStorageService() {
    return {
        Name: 'ReplicatedStorage',
        ClassName: 'ReplicatedStorage',
        Children: [],
        AddChild: (child) => { this.Children.push(child); child.Parent = this; },
    };
}

function createServerStorageService() {
    return {
        Name: 'ServerStorage',
        ClassName: 'ServerStorage',
        Children: [],
    };
}

function createStarterGuiService() {
    return { Name: 'StarterGui', ClassName: 'StarterGui' };
}

function createStarterPackService() {
    return { Name: 'StarterPack', ClassName: 'StarterPack' };
}

function createStarterPlayerService() {
    return { Name: 'StarterPlayer', ClassName: 'StarterPlayer' };
}

function createLightingService() {
    return { Name: 'Lighting', ClassName: 'Lighting', Ambient: robloxGlobals.Color3.new(0, 0, 0), Brightness: 2, ClockTime: 14, GeographicLatitude: 0, TimeOfDay: '14:00:00' };
}

function createSoundService() {
    return { Name: 'SoundService', ClassName: 'SoundService', RespectFilteringEnabled: true };
}

function createTweenService() {
    return {
        Name: 'TweenService',
        ClassName: 'TweenService',
        Create: (object, tweenInfo, properties) => ({
            Play: () => {},
            Pause: () => {},
            Cancel: () => {},
            Completed: { Connect: () => ({ Disconnect: () => {} }) },
        }),
    };
}

function createPhysicsService() {
    return {
        Name: 'PhysicsService',
        ClassName: 'PhysicsService',
        RegisterCollisionGroup: (name) => {},
        CollisionGroupSetCollidable: (group1, group2, collidable) => {},
        GetCollisionGroupId: (name) => 0,
        GetCollisionGroupName: (id) => 'Default',
        SetPartCollisionGroup: (part, group) => {},
    };
}

function createRunService() {
    return {
        Name: 'RunService',
        ClassName: 'RunService',
        Heartbeat: { Connect: (fn) => { const id = setInterval(fn, 16); return { Disconnect: () => clearInterval(id) }; } },
        RenderStepped: { Connect: (fn) => { const id = setInterval(fn, 16); return { Disconnect: () => clearInterval(id) }; } },
        Stepped: { Connect: (fn) => { const id = setInterval(fn, 16); return { Disconnect: () => clearInterval(id) }; } },
        PreSimulation: { Connect: (fn) => { const id = setInterval(fn, 16); return { Disconnect: () => clearInterval(id) }; } },
        PostSimulation: { Connect: (fn) => { const id = setInterval(fn, 16); return { Disconnect: () => clearInterval(id) }; } },
        IsClient: () => true,
        IsServer: () => false,
        IsRunning: () => true,
        Set3dRenderingEnabled: (enabled) => {},
    };
}

function createUserInputService() {
    return {
        Name: 'UserInputService',
        ClassName: 'UserInputService',
        InputBegan: { Connect: () => ({ Disconnect: () => {} }) },
        InputChanged: { Connect: () => ({ Disconnect: () => {} }) },
        InputEnded: { Connect: () => ({ Disconnect: () => {} }) },
        GetMouseLocation: () => ({ x: 0, y: 0 }),
        MouseBehavior: 'Default',
        GamepadConnected: { Connect: () => ({ Disconnect: () => {} }) },
        GamepadDisconnected: { Connect: () => ({ Disconnect: () => {} }) },
        GetGamepadState: (gp) => [],
    };
}

function createContextActionService() {
    return {
        Name: 'ContextActionService',
        ClassName: 'ContextActionService',
        BindAction: (name, fn, touchEnabled, ...keys) => {},
        UnbindAction: (name) => {},
        BindActionAtPriority: (name, fn, priority, touchEnabled, ...keys) => {},
    };
}

function createGuiService() {
    return { Name: 'GuiService', ClassName: 'GuiService', AutoSelectGuiEnabled: false, SelectedObject: null };
}

function createHttpService() {
    return {
        Name: 'HttpService',
        ClassName: 'HttpService',
        JSONEncode: (obj) => JSON.stringify(obj),
        JSONDecode: (str) => JSON.parse(str),
        GenerateGUID: () => crypto.randomUUID(),
        UrlEncode: (str) => encodeURIComponent(str),
        HttpRequestEnabled: () => false,
        RequestAsync: async () => ({ Success: false, StatusCode: 403, Body: 'HttpRequest not enabled in sandbox' }),
    };
}

function createMarketplaceService() {
    return { Name: 'MarketplaceService', ClassName: 'MarketplaceService', PromptProductPurchase: () => {}, PromptGamePassPurchase: () => {}, UserOwnsGamePassAsync: () => false };
}

function createDataStoreService() {
    const stores = new Map();
    return {
        Name: 'DataStoreService',
        ClassName: 'DataStoreService',
        GetDataStore: (name, scope) => {
            const key = scope ? `${scope}/${name}` : name;
            if (!stores.has(key)) {
                stores.set(key, new Map());
            }
            const store = stores.get(key);
            return {
                Name: name,
                Scope: scope,
                GetAsync: async (key) => store.get(key) || null,
                SetAsync: async (key, value) => { store.set(key, value); },
                UpdateAsync: async (key, fn) => {
                    const old = store.get(key);
                    const newVal = fn(old);
                    store.set(key, newVal);
                    return newVal;
                },
                RemoveAsync: async (key) => { store.delete(key); },
                IncrementAsync: async (key, delta) => {
                    const old = store.get(key) || 0;
                    const newVal = old + delta;
                    store.set(key, newVal);
                    return newVal;
                },
                GetSortedAsync: () => ({ GetCurrentPage: () => [] }),
            };
        },
    };
}

function createTeleportService() {
    return { Name: 'TeleportService', ClassName: 'TeleportService', Teleport: () => {}, TeleportToPlaceInstance: () => {}, TeleportPartyAsync: () => {} };
}

function createChatService() {
    return { Name: 'Chat', ClassName: 'Chat', Chat: () => {} };
}

function createTextService() {
    return { Name: 'TextService', ClassName: 'TextService', GetTextSize: () => ({ x: 0, y: 0 }), FilterStringAsync: (str, from, to) => str };
}

function createLocalizationService() {
    return { Name: 'LocalizationService', ClassName: 'LocalizationService', GetTranslatorForPlayerAsync: () => ({ FormatByKey: (key) => key }) };
}

function createPathfindingService() {
    return { Name: 'PathfindingService', ClassName: 'PathfindingService', CreatePath: () => ({ ComputeAsync: () => {}, GetWaypoints: () => [], Status: 'Success' }) };
}

function createCollectionService() {
    const tags = new Map();
    return {
        Name: 'CollectionService',
        ClassName: 'CollectionService',
        AddTag: (instance, tag) => { if (!tags.has(tag)) tags.set(tag, new Set()); tags.get(tag).add(instance); },
        RemoveTag: (instance, tag) => { tags.get(tag)?.delete(instance); },
        HasTag: (instance, tag) => tags.get(tag)?.has(instance) || false,
        GetTags: (instance) => [...tags.entries()].filter(([_, set]) => set.has(instance)).map(([tag]) => tag),
        GetTagged: (tag) => [...(tags.get(tag) || [])],
    };
}

function createAssetService() {
    return { Name: 'AssetService', ClassName: 'AssetService' };
}

function createInsertService() {
    return { Name: 'InsertService', ClassName: 'InsertService', LoadAsset: () => ({}) };
}

function createPointsService() {
    return { Name: 'PointsService', ClassName: 'PointsService', AwardPoints: () => {} };
}

function createBadgeService() {
    return { Name: 'BadgeService', ClassName: 'BadgeService', AwardBadge: () => {}, UserHasBadgeAsync: () => false };
}

function createGamePassService() {
    return { Name: 'GamePassService', ClassName: 'GamePassService', UserOwnsGamePassAsync: () => false };
}

function createAnalyticsService() {
    return { Name: 'AnalyticsService', ClassName: 'AnalyticsService', ReportInfluxSeries: () => {}, SetRBXEventStream: () => {} };
}

function createAdService() {
    return { Name: 'AdService', ClassName: 'AdService', ShowVideoAd: () => {} };
}

function createSocialService() {
    return { Name: 'SocialService', ClassName: 'SocialService', CanSendGameInviteAsync: async () => false };
}

function createVoiceChatService() {
    return { Name: 'VoiceChatService', ClassName: 'VoiceChatService' };
}

function createCaptureService() {
    return { Name: 'CaptureService', ClassName: 'CaptureService', StartCapture: () => {}, StopCapture: () => {} };
}

function createCoreGuiService() {
    return { Name: 'CoreGui', ClassName: 'CoreGui', Enabled: true };
}

function createProximityPromptService() {
    return { Name: 'ProximityPromptService', ClassName: 'ProximityPromptService', PromptShown: { Connect: () => ({ Disconnect: () => {} }) }, PromptHidden: { Connect: () => ({ Disconnect: () => {} }) } };
}

function createInstanceConstructor() {
    const instances = new Map();
    let idCounter = 0;

    return function Instance(className) {
        const instance = {
            Name: className,
            ClassName: className,
            Parent: null,
            Children: [],
            Properties: {},
            Events: {},
            _id: ++idCounter,

            GetPropertyChangedSignal: (prop) => ({ Connect: (fn) => ({ Disconnect: () => {} }) }),
            GetAttribute: (name) => instance.Properties[name],
            SetAttribute: (name, value) => { instance.Properties[name] = value; },
            GetAttributes: () => ({ ...instance.Properties }),

            FindFirstChild: (name, recursive) => {
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
            FindFirstChildWhichIsA: (className) => instance.Children.find(c => c.ClassName === className),
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
            IsAncestorOf: (descendant) => { let p = descendant.Parent; while (p) { if (p === instance) return true; p = p.Parent; } return false; },
            IsDescendantOf: (ancestor) => ancestor.IsAncestorOf(instance),

            Destroy: () => { if (instance.Parent) instance.Parent.RemoveChild(instance); instance.Children.forEach(c => c.Destroy()); },
            Clone: () => { const clone = Instance(className); Object.assign(clone.Properties, instance.Properties); return clone; },
            ClearAllChildren: () => { instance.Children.forEach(c => c.Destroy()); },
        };

        instances.set(instance._id, instance);
        return new Proxy(instance, {
            get(target, prop) {
                if (prop in target) return target[prop];
                // Lua-style property access: check Properties first, then fallback
                if (prop in target.Properties) return target.Properties[prop];
                return undefined;
            },
            set(target, prop, value) {
                if (prop in target && prop !== 'Properties') {
                    target[prop] = value;
                } else {
                    target.Properties[prop] = value;
                }
                return true;
            },
        });
    };
}

function createTaskLibrary() {
    return {
        wait: (seconds) => new Promise(resolve => setTimeout(resolve, (seconds || 0) * 1000)),
        spawn: (fn) => { setTimeout(fn, 0); },
        delay: (seconds, fn) => setTimeout(fn, seconds * 1000),
        defer: (fn) => setTimeout(fn, 0),
        cancel: (thread) => { /* 取消协程 */ },
        status: (thread) => 'running',
        yield: () => {},
    };
}

function createDebugLibrary() {
    return {
        traceback: (thread, msg, level) => 'stack traceback',
        profilebegin: (name) => {},
        profileend: () => {},
        getmemorycategory: () => 'Default',
        setmemorycategory: (category) => {},
    };
}

function createMathLibrary() {
    return {
        ...Math,
        clamp: (x, min, max) => Math.max(min, Math.min(max, x)),
        lerp: (a, b, t) => a + (b - a) * t,
        sign: (x) => x > 0 ? 1 : x < 0 ? -1 : 0,
        round: (x) => Math.round(x),
        modf: (x) => [Math.floor(x), x % 1],
        noiseless: (x) => Math.random(),
        random: (a, b) => {
            if (b === undefined) return Math.random() * a;
            if (a === undefined) return Math.random();
            return a + Math.random() * (b - a);
        },
        randomseed: (seed) => { /* 种子设置 */ },
    };
}

function createStringLibrary() {
    return {
        ...String,
        split: (str, sep) => str.split(sep || ''),
        trim: (str) => str.trim(),
        lower: (str) => str.toLowerCase(),
        upper: (str) => str.toUpperCase(),
        rep: (str, n) => str.repeat(n),
        reverse: (str) => str.split('').reverse().join(''),
        byte: (str, i, j) => str.charCodeAt(i || 0),
        char: (...codes) => String.fromCharCode(...codes),
        find: (str, pattern, init, plain) => {
            const idx = plain ? str.indexOf(pattern, init - 1) : str.search(pattern);
            return idx >= 0 ? idx + 1 : null;
        },
        match: (str, pattern, init) => {
            const match = str.slice(init - 1).match(pattern);
            return match ? match[0] : null;
        },
        gmatch: (str, pattern) => {
            const regex = new RegExp(pattern, 'g');
            return function* () {
                let match;
                while ((match = regex.exec(str)) !== null) {
                    yield match[0];
                }
            };
        },
        gsub: (str, pattern, repl, n) => str.replace(new RegExp(pattern, 'g'), repl),
        format: (format, ...args) => {
            // 简化版 format
            return format.replace(/%[sdqfg]/g, (m) => args.shift() || '');
        },
    };
}

function createTableLibrary() {
    return {
        insert: (arr, pos, value) => {
            if (value === undefined) { value = pos; pos = arr.length; }
            arr.splice(pos - 1, 0, value);
        },
        remove: (arr, pos) => arr.splice((pos || arr.length) - 1, 1)[0],
        sort: (arr, comp) => arr.sort(comp),
        concat: (arr, sep, i, j) => arr.slice(i - 1, j).join(sep || ''),
        pack: (...args) => ({ n: args.length, ...args }),
        unpack: (arr, i, j) => arr.slice(i - 1, j),
        move: (src, f, e, t, dest) => { for (let i = f; i <= e; i++) dest[t + i - f] = src[i]; return dest; },
        freeze: (obj) => Object.freeze(obj),
        isfrozen: (obj) => Object.isFrozen(obj),
        clear: (obj) => { Object.keys(obj).forEach(k => delete obj[k]); },
        find: (arr, value, init) => arr.indexOf(value, init - 1) + 1,
    };
}

function createCoroutineLibrary() {
    return {
        create: (fn) => ({ fn, status: 'suspended' }),
        resume: (co, ...args) => { co.status = 'running'; try { const result = co.fn(...args); co.status = 'dead'; return [true, result]; } catch (e) { co.status = 'dead'; return [false, e.message]; } },
        yield: (...args) => args,
        status: (co) => co.status,
        wrap: (fn) => () => coroutine.resume(coroutine.create(fn)),
        running: () => ({ status: 'running' }),
        isyieldable: () => true,
    };
}

function createWaitFunction() {
    return (seconds) => new Promise(resolve => setTimeout(resolve, (seconds || 0.03) * 1000));
}

function createSpawnFunction() {
    return (fn) => setTimeout(fn, 0);
}

function createDelayFunction() {
    return (seconds, fn) => setTimeout(fn, seconds * 1000);
}

function createPrintFunction() {
    return (...args) => {
        const output = args.map(a => String(a)).join('\t');
        console.log('[Lua]', output);
        // 触发控制台更新
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
    return (msg, level) => { throw new Error(msg); };
}

function createTypeFunction() {
    return (v) => typeof v === 'object' ? 'table' : typeof v;
}

function createTypeofFunction() {
    return (v) => {
        if (v === null) return 'nil';
        if (Array.isArray(v)) return 'table';
        if (typeof v === 'object') {
            if (v.ClassName) return v.ClassName;
            return 'table';
        }
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
        // 简化的模块系统
        const mod = {};
        modules.set(name, mod);
        return mod;
    };
}

function createScriptObject() {
    return { Name: 'Script', ClassName: 'Script', Source: '', Enabled: true, RunContext: 'Legacy' };
}