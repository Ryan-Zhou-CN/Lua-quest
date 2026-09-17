/**
 * 章节数据模块
 * 定义所有 10 章的内容、目标、测试、提示、NPC
 */

// ============================================================================
// 章节定义
// ============================================================================
const chapters = {
    prologue: {
        id: 'prologue',
        title: 'Hello Roblox',
        badge: 'Prologue',
        description: '修好坏掉的 Obby，发布你的第一个游戏版本。学习 Luau 基础语法、变量、print、基础 API、ModuleScript 入门。',
        objectives: [
            {
                id: 'print_hello',
                title: '在控制台输出 "Hello, Roblox!"',
                reward: { xp: 10, money: 50 },
                check: (code) => code.includes('print') && code.includes('Hello'),
            },
            {
                id: 'create_part',
                title: '创建一个 Part 并设置颜色',
                reward: { xp: 20, money: 100 },
                check: (code) => code.includes('Instance.new') && code.includes('Part') && code.includes('Color3'),
            },
            {
                id: 'module_script',
                title: '编写第一个 ModuleScript 并 require 它',
                reward: { xp: 30, money: 200 },
                check: (code) => code.includes('module') && code.includes('require'),
            },
        ],
        hints: [
            { title: '基础输出', content: '使用 print() 可以在控制台输出文本，这是调试的基础。', code: 'print("Hello, Roblox!")' },
            { title: '创建实例', content: '使用 Instance.new("ClassName") 创建新对象，然后设置属性。', code: 'local part = Instance.new("Part")\npart.Color = Color3.fromRGB(255, 0, 0)\npart.Parent = workspace' },
            { title: 'ModuleScript', content: 'ModuleScript 返回一个表，其他脚本可以通过 require() 复用代码。', code: '-- ModuleScript (命名为 "MyModule")\nlocal M = {}\nfunction M.greet(name)\n    return "Hello, " .. name .. "!"\nend\nreturn M\n\n-- 普通脚本\nlocal M = require(script.Parent.MyModule)\nprint(M.greet("Player"))' },
        ],
        tests: [
            {
                name: '基础语法测试',
                code: 'print("Test")\nassert(1 + 1 == 2)',
                assert: (result) => result.success,
            },
            {
                name: '实例创建测试',
                code: 'local p = Instance.new("Part")\np.Name = "TestPart"\nreturn p.Name == "TestPart"',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['mentor'],
        progress: 0,
    },
    
    ch1: {
        id: 'ch1',
        title: '脚本与实例',
        badge: 'Ch 1',
        description: '搭建「刷怪器/波次系统」。掌握实例树、Parent/Child 关系、属性操作、事件绑定、Script/LocalScript/ModuleScript 区别。',
        objectives: [
            {
                id: 'spawner_basic',
                title: '编写基础刷怪器：每 5 秒生成一个怪物',
                reward: { xp: 50, money: 500 },
                check: (code) => code.includes('wait') && code.includes('Instance.new') && code.includes('Parent'),
            },
            {
                id: 'wave_system',
                title: '实现波次系统：每波怪物数量递增',
                reward: { xp: 80, money: 1000 },
                check: (code) => code.includes('for') && code.includes('wave') && code.includes('spawn'),
            },
            {
                id: 'event_connection',
                title: '绑定怪物死亡事件，发放奖励',
                reward: { xp: 60, money: 800 },
                check: (code) => code.includes('Connect') && (code.includes('Died') || code.includes('Humanoid')),
            },
        ],
        hints: [
            { title: '循环与等待', content: '使用 while true do ... wait(n) end 创建无限循环，或用 for 循环控制次数。', code: 'for wave = 1, 10 do\n    for i = 1, wave * 2 do\n        spawnEnemy()\n        wait(0.5)\n    end\n    wait(10) -- 波次间隔\nend' },
            { title: '事件连接', content: '使用 :Connect() 监听事件，返回连接对象可用 :Disconnect() 断开。', code: 'local connection = humanoid.Died:Connect(function()\n    giveReward(player)\n    connection:Disconnect()\nend)' },
            { title: '脚本类型', content: 'Script 在服务端运行，LocalScript 在客户端运行，ModuleScript 被 require 复用。', type: 'info' },
        ],
        tests: [
            {
                name: '刷怪器功能测试',
                code: 'local spawned = 0\nfor i = 1, 3 do\n    local e = Instance.new("Model")\n    e.Name = "Enemy" .. i\n    spawned = spawned + 1\n    wait(0.1)\nend\nreturn spawned == 3',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['mentor', 'rival'],
        progress: 0,
    },
    
    ch2: {
        id: 'ch2',
        title: 'DataStore 持久化',
        badge: 'Ch 2',
        description: '实现「自动存档/读档/版本迁移」。掌握 DataStore、UpdateAsync、错误重试、数据版本控制、防止数据丢失。',
        objectives: [
            {
                id: 'basic_save',
                title: '实现玩家金币/等级的保存与读取',
                reward: { xp: 60, money: 1000 },
                check: (code) => code.includes('DataStoreService') && code.includes('SetAsync') && code.includes('GetAsync'),
            },
            {
                id: 'update_async',
                title: '使用 UpdateAsync 实现原子性金币增加',
                reward: { xp: 80, money: 1500 },
                check: (code) => code.includes('UpdateAsync'),
            },
            {
                id: 'version_migration',
                title: '添加数据版本号，实现旧版本数据迁移',
                reward: { xp: 100, money: 2000 },
                check: (code) => code.includes('version') && code.includes('migrate'),
            },
            {
                id: 'error_retry',
                title: '实现指数退避重试机制，处理网络错误',
                reward: { xp: 70, money: 1200 },
                check: (code) => code.includes('retry') || code.includes('pcall'),
            },
        ],
        hints: [
            { title: 'DataStore 基础', content: 'GetDataStore(name) 获取存储，GetAsync/SetAsync 读写，注意要用 pcall 捕获错误。', code: 'local ds = game:GetService("DataStoreService"):GetDataStore("PlayerData")\nlocal success, data = pcall(function() return ds:GetAsync("player_" .. player.UserId) end)' },
            { title: 'UpdateAsync 原子操作', content: 'UpdateAsync 接受函数，参数是旧值，返回新值，保证并发安全。', code: 'ds:UpdateAsync(key, function(old)\n    old = old or { coins = 0 }\n    old.coins = old.coins + amount\n    return old\nend)' },
            { title: '版本迁移', content: '在数据中存储 version 字段，读取时检查版本并按需迁移。', code: 'local DATA_VERSION = 3\nlocal function migrate(data)\n    if not data.version then data.version = 1 end\n    if data.version < 2 then data.gems = 0; data.version = 2 end\n    if data.version < 3 then data.inventory = {}; data.version = 3 end\n    return data\nend' },
            { title: '错误重试', content: '网络请求可能失败，使用指数退避重试：1s, 2s, 4s, 8s...', code: 'local function retry(fn, maxAttempts)\n    local attempt = 0\n    while attempt < maxAttempts do\n        local ok, result = pcall(fn)\n        if ok then return result end\n        attempt = attempt + 1\n        wait(2 ^ attempt)\n    end\n    error("Max retries exceeded")\nend' },
        ],
        tests: [
            {
                name: 'DataStore 读写测试',
                code: 'local ds = game:GetService("DataStoreService"):GetDataStore("Test")\nds:SetAsync("key", { value = 42 })\nlocal data = ds:GetAsync("key")\nreturn data.value == 42',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['mentor', 'investor'],
        progress: 0,
    },
    
    ch3: {
        id: 'ch3',
        title: '远程通信',
        badge: 'Ch 3',
        description: '做「多人合作小游戏」。掌握 RemoteEvent/Function、Client-Server 模型、防作弊验证、延迟补偿。',
        objectives: [
            {
                id: 'remote_event',
                title: '使用 RemoteEvent 实现客户端请求服务端治疗',
                reward: { xp: 70, money: 1500 },
                check: (code) => code.includes('RemoteEvent') && code.includes('FireServer') && code.includes('OnServerEvent'),
            },
            {
                id: 'remote_function',
                title: '使用 RemoteFunction 实现客户端查询商品价格',
                reward: { xp: 80, money: 1800 },
                check: (code) => code.includes('RemoteFunction') && code.includes('InvokeServer'),
            },
            {
                id: 'anti_cheat',
                title: '添加服务端验证：防止客户端篡改伤害数值',
                reward: { xp: 100, money: 2500 },
                check: (code) => code.includes('validate') || code.includes('sanity') || code.includes('clamp'),
            },
        ],
        hints: [
            { title: 'RemoteEvent 单向通信', content: '客户端 FireServer，服务端 OnServerEvent；服务端 FireClient/AllClients，客户端 OnClientEvent。', code: '-- 客户端\nremoteEvent:FireServer("heal")\n\n-- 服务端\nremoteEvent.OnServerEvent:Connect(function(player, action)\n    if action == "heal" then healPlayer(player) end\nend)' },
            { title: 'RemoteFunction 双向通信', content: '客户端 InvokeServer 等待返回值，服务端 OnServerInvoke 返回结果。注意：会阻塞调用线程。', code: '-- 客户端\nlocal price = remoteFunction:InvokeServer("sword")\n\n-- 服务端\nremoteFunction.OnServerInvoke = function(player, item)\n    return PRICES[item] or 0\nend' },
            { title: '防作弊原则', content: '永远不要信任客户端数据。服务端必须验证：距离检查、冷却时间、数值合法性、权限校验。', code: 'remoteEvent.OnServerEvent:Connect(function(player, target, damage)\n    -- 验证距离\n    if (player.Character.HumanoidRootPart.Position - target.Position).Magnitude > 20 then\n        return -- 太远，作弊\n    end\n    -- 验证冷却\n    if tick() - (player.LastAttack or 0) < 1 then return end\n    player.LastAttack = tick()\n    -- 应用伤害\n    target:TakeDamage(math.clamp(damage, 0, 50))\nend)' },
        ],
        tests: [
            {
                name: '远程通信测试',
                code: 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal remote = Instance.new("RemoteEvent")\nremote.Name = "TestRemote"\nremote.Parent = ReplicatedStorage\n\nlocal received = false\nremote.OnServerEvent:Connect(function() received = true end)\nremote:FireServer()\nwait(0.1)\nreturn received',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['mentor', 'security'],
        progress: 0,
    },
    
    ch4: {
        id: 'ch4',
        title: 'UI 与输入',
        badge: 'Ch 4',
        description: '制作「HUD/背包/商店/设置」。掌握 ScreenGui、UserInputService、响应式布局、手柄/触屏适配。',
        objectives: [
            {
                id: 'hud_basic',
                title: '创建基础 HUD：血条、金币、小地图',
                reward: { xp: 60, money: 1200 },
                check: (code) => code.includes('ScreenGui') && code.includes('Frame') && code.includes('TextLabel'),
            },
            {
                id: 'inventory_ui',
                title: '实现可拖拽的背包系统',
                reward: { xp: 100, money: 2000 },
                check: (code) => code.includes('UIGridLayout') && code.includes('InputBegan') && code.includes('Drag'),
            },
            {
                id: 'responsive',
                title: '适配手机/平板/PC 不同分辨率',
                reward: { xp: 80, money: 1500 },
                check: (code) => code.includes('AbsoluteSize') || code.includes('UIScale') || code.includes('ViewportSize'),
            },
        ],
        hints: [
            { title: 'ScreenGui 基础', content: 'ScreenGui 是 UI 容器，ResetOnSpawn 控制重生时是否重置。', code: 'local screenGui = Instance.new("ScreenGui")\nscreenGui.Name = "HUD"\nscreenGui.ResetOnSpawn = false\nscreenGui.Parent = game.Players.LocalPlayer.PlayerGui' },
            { title: '响应式布局', content: '使用 UIGridLayout/UIListLayout 自动排列，UIAspectRatioConstraint 保持比例，UIScale 适配缩放。', code: 'local scale = Instance.new("UIScale")\nscale.Scale = math.min(viewport.X / 1920, viewport.Y / 1080)\nscale.Parent = screenGui' },
            { title: '输入处理', content: 'UserInputService 处理键盘/鼠标/手柄/触屏，ContextActionService 绑定动作优先级。', code: 'local UIS = game:GetService("UserInputService")\nUIS.InputBegan:Connect(function(input, processed)\n    if not processed and input.KeyCode == Enum.KeyCode.E then\n        openInventory()\n    end\nend)' },
        ],
        tests: [
            {
                name: 'UI 创建测试',
                code: 'local gui = Instance.new("ScreenGui")\nlocal frame = Instance.new("Frame")\nframe.Size = UDim2.new(0, 200, 0, 100)\nframe.Parent = gui\nreturn frame.Size.X.Offset == 200',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['artist', 'mentor'],
        progress: 0,
    },
    
    ch5: {
        id: 'ch5',
        title: '物理与移动',
        badge: 'Ch 5',
        description: '调教「跑酷手感/自定义移动」。掌握物理引擎、碰撞组、CFrame/向量数学、BodyMover/Constraint。',
        objectives: [
            {
                id: 'custom_movement',
                title: '实现自定义移动：加速度、最大速度、空中控制',
                reward: { xp: 100, money: 2000 },
                check: (code) => code.includes('Vector3') && code.includes('AssemblyLinearVelocity') && code.includes('MoveDirection'),
            },
            {
                id: 'physics_constraints',
                title: '使用 AlignPosition/AlignOrientation 实现平滑移动平台',
                reward: { xp: 80, money: 1500 },
                check: (code) => code.includes('AlignPosition') || code.includes('AlignOrientation'),
            },
            {
                id: 'collision_groups',
                title: '配置碰撞组：玩家穿过幽灵、子弹穿过队友',
                reward: { xp: 70, money: 1200 },
                check: (code) => code.includes('CollisionGroup') || code.includes('PhysicsService'),
            },
        ],
        hints: [
            { title: '向量数学', content: 'CFrame 表示位置+旋转，Vector3 表示方向/位置。常用：LookVector, RightVector, UpVector, Lerp, Slerp。', code: 'local cf = CFrame.new(0, 10, 0) * CFrame.Angles(0, math.rad(45), 0)\nlocal look = cf.LookVector -- 前方向量\nlocal pos = cf.Position' },
            { title: '约束系统', content: 'BodyMover 已弃用，改用 Constraints：AlignPosition, AlignOrientation, LinearVelocity, AngularVelocity, VectorForce。', code: 'local alignPos = Instance.new("AlignPosition")\nalignPos.Mode = Enum.PositionAlignmentMode.OneAttachment\nalignPos.Attachment0 = attachment\nalignPos.Position = targetPos\nalignPos.MaxForce = 10000\nalignPos.Responsiveness = 50' },
            { title: '碰撞组', content: 'PhysicsService 管理碰撞组，SetPartCollisionGroup 设置部件组，CollisionGroupSetCollidable 设置组间碰撞。', code: 'local PS = game:GetService("PhysicsService")\nPS:RegisterCollisionGroup("Ghost")\nPS:RegisterCollisionGroup("Player")\nPS:CollisionGroupSetCollidable("Ghost", "Player", false)' },
        ],
        tests: [
            {
                name: '向量运算测试',
                code: 'local v1 = Vector3.new(1, 0, 0)\nlocal v2 = Vector3.new(0, 1, 0)\nlocal dot = v1:Dot(v2)\nlocal cross = v1:Cross(v2)\nreturn dot == 0 and cross == Vector3.new(0, 0, 1)',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['physics'],
        progress: 0,
    },
    
    ch6: {
        id: 'ch6',
        title: '动画与状态机',
        badge: 'Ch 6',
        description: '实现「战斗连招/技能系统」。掌握 AnimationTrack、状态机、取消/过渡/事件、服务端同步。',
        objectives: [
            {
                id: 'animation_basic',
                title: '加载并播放动画，监听关键帧事件',
                reward: { xp: 80, money: 1800 },
                check: (code) => code.includes('Animation') && code.includes('LoadAnimation') && code.includes('GetMarkerReachedSignal'),
            },
            {
                id: 'state_machine',
                title: '实现战斗状态机：待机→攻击→连招→冷却',
                reward: { xp: 120, money: 3000 },
                check: (code) => code.includes('state') && code.includes('transition') && code.includes('combo'),
            },
            {
                id: 'animation_cancel',
                title: '实现动画取消/打断：闪避打断攻击',
                reward: { xp: 90, money: 2200 },
                check: (code) => code.includes('Stop') && code.includes('Priority') && code.includes('Action'),
            },
        ],
        hints: [
            { title: 'AnimationTrack', content: 'Animator:LoadAnimation(animation) 返回 Track，控制播放/停止/速度/权重。KeyframeReached 用于击中判定。', code: 'local track = animator:LoadAnimation(anim)\ntrack.Priority = Enum.AnimationPriority.Action\ntrack:GetMarkerReachedSignal("Hit"):Connect(doDamage)\ntrack:Play()' },
            { title: '状态机模式', content: '用表驱动状态机：states = { idle = {}, attack = { next = "combo" } }，transition 函数处理切换逻辑。', code: 'local state = "idle"\nlocal function transition(newState)\n    if validTransitions[state][newState] then\n        exitState(state)\n        state = newState\n        enterState(state)\n    end\nend' },
            { title: '服务端同步', content: '动画在客户端播放，服务端同步状态/伤害。用 RemoteEvent 同步关键帧，避免延迟导致判定不一致。', code: '-- 客户端播放动画同时发送\nremoteEvent:FireServer("attack", comboIndex)\n\n-- 服务端验证后广播\nremoteEvent.OnServerEvent:Connect(function(player, action, index)\n    if validateAttack(player) then\n        remoteEvent:FireAllClients("attackEffect", player, index)\n    end\nend)' },
        ],
        tests: [
            {
                name: '动画状态机测试',
                code: 'local state = "idle"\nlocal function setState(s) state = s end\nsetState("attack")\nsetState("combo")\nreturn state == "combo"',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['animator'],
        progress: 0,
    },
    
    ch7: {
        id: 'ch7',
        title: '性能与优化',
        badge: 'Ch 7',
        description: '诊断「掉帧/内存泄漏/网络抖动」。掌握 MicroProfiler、内存分析、实例复用、空间划分、并行 Luau、GC 调优。',
        objectives: [
            {
                id: 'microprofiler',
                title: '使用 MicroProfiler 定位帧率瓶颈',
                reward: { xp: 100, money: 2500 },
                check: (code) => code.includes('MicroProfiler') || code.includes('debug.profilebegin'),
            },
            {
                id: 'instance_pooling',
                title: '实现对象池：子弹/特效/怪物复用',
                reward: { xp: 120, money: 3000 },
                check: (code) => code.includes('pool') && (code.includes('Get') || code.includes('Return')),
            },
            {
                id: 'parallel_luau',
                title: '使用 task.desynchronize 并行处理大量单位 AI',
                reward: { xp: 150, money: 5000 },
                check: (code) => code.includes('task.desynchronize') || code.includes('Parallel'),
            },
        ],
        hints: [
            { title: 'MicroProfiler', content: '按 Ctrl+F6 打开，查看各系统耗时。debug.profilebegin/end 标记自定义区域。', code: 'debug.profilebegin("EnemyAI")\nfor _, enemy in ipairs(enemies) do\n    updateEnemy(enemy)\nend\ndebug.profileend()' },
            { title: '对象池模式', content: '预创建对象，用完放回池子，避免频繁 Create/Destroy 触发 GC。', code: 'local pool = {}\nfunction getBullet()\n    local b = table.remove(pool)\n    if not b then b = createBullet() end\n    b.Visible = true\n    return b\nend\nfunction returnBullet(b)\n    b.Visible = false\n    table.insert(pool, b)\nend' },
            { title: '并行 Luau', content: 'task.desynchronize() 切换到并行上下文，只能读取数据；task.synchronize() 切回主线程写入。适合大量纯计算。', code: 'task.desynchronize()\nfor _, unit in ipairs(units) do\n    unit:calculatePath() -- 只读\nend\ntask.synchronize()\nfor _, unit in ipairs(units) do\n    unit:applyPath() -- 写入\nend' },
        ],
        tests: [
            {
                name: '对象池测试',
                code: 'local pool = {}\nfor i = 1, 10 do table.insert(pool, {id=i}) end\nlocal function get() return table.remove(pool) end\nlocal function put(obj) table.insert(pool, obj) end\nlocal obj = get()\nput(obj)\nreturn #pool == 10',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['perf'],
        progress: 0,
    },
    
    ch8: {
        id: 'ch8',
        title: '模块化架构',
        badge: 'Ch 8',
        description: '重构「僵尸代码库」为 Knit/ECS/自定义框架。掌握单一职责、依赖注入、事件总线、模块热更、单元测试、CI/CD。',
        objectives: [
            {
                id: 'service_pattern',
                title: '实现 Service/Controller 模式（类 Knit 架构）',
                reward: { xp: 150, money: 5000 },
                check: (code) => code.includes('Service') && code.includes('Controller') && code.includes('Require'),
            },
            {
                id: 'dependency_injection',
                title: '实现依赖注入容器，解耦模块',
                reward: { xp: 120, money: 3500 },
                check: (code) => code.includes('inject') || code.includes('container') || code.includes('resolve'),
            },
            {
                id: 'unit_testing',
                title: '编写单元测试，集成测试运行器',
                reward: { xp: 100, money: 2500 },
                check: (code) => code.includes('test') && code.includes('assert'),
            },
        ],
        hints: [
            { title: 'Knit 架构', content: 'Service 处理服务端逻辑，Controller 处理客户端逻辑，共享 Shared 模块。用 Knit.Start() 启动。', code: 'local Knit = require(ReplicatedStorage.Knit)\nlocal MyService = Knit.CreateService({ Name = "MyService" })\nfunction MyService:GetData(player) return data end' },
            { title: '依赖注入', content: '容器管理单例/瞬态服务，构造函数声明依赖，容器自动注入。便于测试时替换 Mock。', code: 'local Container = {}\nfunction Container:Register(name, factory)\n    self[name] = factory\nend\nfunction Container:Resolve(name)\n    if not self[name] then error("Not registered: " .. name) end\n    return self[name]()\nend' },
            { title: '单元测试', content: '测试文件命名为 *.spec.lua，使用 assert 验证，测试运行器收集并执行。', code: '-- MathUtils.spec.lua\nlocal MathUtils = require("MathUtils")\nassert(MathUtils.clamp(5, 0, 10) == 5)\nassert(MathUtils.clamp(-1, 0, 10) == 0)\nassert(MathUtils.clamp(15, 0, 10) == 10)\nprint("All tests passed")' },
        ],
        tests: [
            {
                name: '依赖注入测试',
                code: 'local Container = {}\nContainer:Register("service", function() return {value = 42} end)\nlocal s = Container:Resolve("service")\nreturn s.value == 42',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['architect'],
        progress: 0,
    },
    
    ch9: {
        id: 'ch9',
        title: '发布与运营',
        badge: 'Ch 9',
        description: '制定「更新计划/A/B 测试/数据埋点/变现」。掌握 Analytics、A/B Test、LiveOps、Battle Pass、伦理变现、社区管理。',
        objectives: [
            {
                id: 'analytics',
                title: '埋点关键指标：留存、付费转化、关卡完成率',
                reward: { xp: 100, money: 3000 },
                check: (code) => code.includes('AnalyticsService') || code.includes('ReportInfluxSeries'),
            },
            {
                id: 'ab_test',
                title: '实现 A/B 测试框架：随机分组、指标对比',
                reward: { xp: 120, money: 4000 },
                check: (code) => code.includes('abtest') || code.includes('variant') || code.includes('experiment'),
            },
            {
                id: 'liveops',
                title: '设计 Battle Pass 系统：赛季、等级、奖励、付费解锁',
                reward: { xp: 150, money: 5000 },
                check: (code) => code.includes('battlepass') || code.includes('season') && code.includes('tier'),
            },
        ],
        hints: [
            { title: '数据埋点', content: 'AnalyticsService:ReportInfluxSeries 发送自定义事件，或用 HttpService 上报到自建后端。', code: 'game:GetService("AnalyticsService"):ReportInfluxSeries("LevelComplete", {level = 5, time = 120})' },
            { title: 'A/B 测试', content: '玩家入组哈希分配，记录 variant，定期对比核心指标。需足够样本量（建议每组 1000+）。', code: 'local function getVariant(player)\n    local hash = tonumber(string.sub(player.UserId, -3))\n    return hash % 2 == 0 and "A" or "B"\nend' },
            { title: '伦理变现', content: '避免 P2W：只售卖外观、便利、Battle Pass。保证免费玩家也能获得核心体验，付费加速非付费锁内容。', type: 'warning' },
        ],
        tests: [
            {
                name: 'A/B 测试分组测试',
                code: 'local function getVariant(id)\n    return (id % 2 == 0) and "A" or "B"\nend\nlocal a = 0\nfor i = 1, 1000 do if getVariant(i) == "A" then a = a + 1 end end\nreturn a > 450 and a < 550',
                assert: (result) => result.result === true,
            },
        ],
        npcs: ['producer', 'community'],
        progress: 0,
    },
    
    endless: {
        id: 'endless',
        title: '周常 Game Jam',
        badge: 'Endless',
        description: '程序生成主题，限时开发，排行榜竞速。综合实战、工程权衡、技术债管理、团队协作。',
        objectives: [
            {
                id: 'jam_participate',
                title: '参加本周 Game Jam 并提交作品',
                reward: { xp: 200, money: 5000, reputation: 50 },
                check: (code) => code.length > 100,
            },
        ],
        hints: [
            { title: 'Game Jam 技巧', content: '先做核心玩法原型，再加美术/音效。用模块化代码复用过往积累。技术债可控：先跑通流程再重构。', type: 'info' },
            { title: '时间管理', content: 'Day 1: 核心机制 | Day 2: 关卡/内容 | Day 3: 打磨/修Bug/提交。预留 20% 时间做应急。', type: 'warning' },
        ],
        tests: [],
        npcs: ['jam_host'],
        progress: 0,
    },
};

// ============================================================================
// 导出函数
// ============================================================================
export function getCurrentChapter(chapterId) {
    return chapters[chapterId] || chapters.prologue;
}

export function getAllChapters() {
    return Object.values(chapters);
}

export function getChapterOrder() {
    return ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'endless'];
}

export function isChapterUnlocked(chapterId, completedChapters) {
    const order = getChapterOrder();
    const index = order.indexOf(chapterId);
    if (index <= 0) return true; // Prologue always unlocked
    const prevChapter = order[index - 1];
    return completedChapters.includes(prevChapter);
}

// 默认导出
export default chapters;

/**
 * 加载章节数据
 * 返回章节对象，供 UI 渲染使用
 */
export function loadChapter(chapterId) {
    return getCurrentChapter(chapterId);
}