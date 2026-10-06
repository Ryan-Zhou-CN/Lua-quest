-- BotController.luau — 机器人控制器（Luau 侧实现）
-- 执行行为树驱动的 AI 行为，用于 QA 模拟

type BehaviorNode = {
    type: "selector" | "sequence" | "action" | "condition",
    children: { BehaviorNode }?,
    action: string?,
    params: { [string]: any }?,
    condition: ((BotState) -> boolean)?,
}

type BotState = {
    id: string,
    position: { x: number, y: number, z: number },
    health: number,
    maxHealth: number,
    inventory: { [string]: number },
    target: string?,
    state: "idle" | "move" | "attack" | "flee" | "interact",
    lastActionTime: number,
    stuckTimer: number,
}

local BotController = {}
BotController.__index = BotController

export type BotController = typeof(setmetatable({} :: any, BotController))

function BotController.new(contractId: string, index: number, qaConfig: any, botConfig: any): BotController
    local self = setmetatable({}, BotController)
    self.id = "bot_" .. index
    self.contractId = contractId
    self.config = botConfig
    self.behaviorTree = botConfig.behaviorTree
    self.state = {
        id = "bot_" .. math.random(1000000),
        position = { x = 0, y = 0, z = 0 },
        health = 100,
        maxHealth = 100,
        inventory = {},
        target = nil,
        state = "idle",
        lastActionTime = 0,
        stuckTimer = 0,
    }
    return self
end

function BotController:tick(currentTime: number): ()
    self:_executeBehaviorTree(self.behaviorTree, currentTime)
end

function BotController:_executeBehaviorTree(node: BehaviorNode, currentTime: number): boolean
    if node.type == "selector" then
        if node.children then
            for _, child in ipairs(node.children) do
                if self:_executeBehaviorTree(child, currentTime) then
                    return true
                end
            end
        end
        return false
    elseif node.type == "sequence" then
        if node.children then
            for _, child in ipairs(node.children) do
                if not self:_executeBehaviorTree(child, currentTime) then
                    return false
                end
            end
        end
        return true
    elseif node.type == "condition" then
        if node.condition then
            return node.condition(self.state)
        end
        return false
    elseif node.type == "action" then
        return self:_executeAction(node.action, currentTime)
    end
    return false
end

function BotController:_executeAction(action: string, currentTime: number): boolean
    if action == "idle" then
        self.state.state = "idle"
        return true
    elseif action == "findTarget" then
        self.state.target = "target_" .. math.floor(math.random() * 10)
        self.state.state = "move"
        return true
    elseif action == "moveTo" then
        self.state.state = "move"
        self.state.position.x = self.state.position.x + math.random() * 5 - 2.5
        self.state.position.z = self.state.position.z + math.random() * 5 - 2.5
        if math.random() > 0.7 then self.state.state = "attack" end
        return true
    elseif action == "attack" then
        self.state.state = "attack"
        self.state.lastActionTime = currentTime
        return true
    elseif action == "flee" then
        self.state.state = "flee"
        return true
    elseif action == "interact" then
        self.state.state = "interact"
        return true
    else
        warn("Unknown action: " .. tostring(action))
        return false
    end
end

function BotController:getState(): BotState
    local copy = {}
    for k, v in pairs(self.state) do copy[k] = v end
    return copy
end

return BotController