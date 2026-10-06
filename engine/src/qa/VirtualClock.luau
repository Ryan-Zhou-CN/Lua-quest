-- VirtualClock.luau — 虚拟时钟（Luau 侧实现）
-- 用于确定性回放和 QA 模拟时间控制

local VirtualClock = {}

VirtualClock.currentTime = 0
VirtualClock.timeScale = 1
VirtualClock.paused = false
VirtualClock._subscribers = {}

function VirtualClock.getTime(): number
    return VirtualClock.currentTime
end

function VirtualClock.setTime(time: number): ()
    VirtualClock.currentTime = time
    VirtualClock._notifySubscribers()
end

function VirtualClock.tick(deltaMs: number): ()
    if not VirtualClock.paused then
        VirtualClock.currentTime = VirtualClock.currentTime + deltaMs
    end
end

function VirtualClock.advance(deltaMs: number): ()
    VirtualClock.currentTime = VirtualClock.currentTime + deltaMs * VirtualClock.timeScale
end

function VirtualClock.setTimeScale(scale: number): ()
    VirtualClock.timeScale = math.max(0, scale)
end

function VirtualClock.getTimeScale(): number
    return VirtualClock.timeScale
end

function VirtualClock.pause(): ()
    VirtualClock.paused = true
end

function VirtualClock.resume(): ()
    VirtualClock.paused = false
end

function VirtualClock.isPaused(): boolean
    return VirtualClock.paused
end

function VirtualClock.subscribe(callback: (number) -> ()): () -> ()
    table.insert(VirtualClock._subscribers, callback)
    return function()
        for i, cb in ipairs(VirtualClock._subscribers) do
            if cb == callback then
                table.remove(VirtualClock._subscribers, i)
                break
            end
        end
    end
end

function VirtualClock._notifySubscribers(): ()
    for _, cb in ipairs(VirtualClock._subscribers) do
        cb(VirtualClock.currentTime)
    end
end

-- 关键：wait 返回 Promise，供 task.wait 使用
-- Luau 原生 Promise 在 luau-web 中可用
function VirtualClock.wait(seconds: number)
    local targetTime = VirtualClock.currentTime + seconds * 1000
    return Promise.new(function(resolve: () -> ())
        local function check()
            if VirtualClock.currentTime >= targetTime then
                resolve()
            else
                -- 下一帧再检查（通过 task.defer）
                task.defer(check)
            end
        end
        check()
    end)
end

function VirtualClock.getState(): { time: number, scale: number, paused: boolean }
    return {
        time = VirtualClock.currentTime,
        scale = VirtualClock.timeScale,
        paused = VirtualClock.paused,
    }
end

function VirtualClock.setState(state: { time: number, scale: number, paused: boolean }): ()
    VirtualClock.currentTime = state.time
    VirtualClock.timeScale = state.scale
    VirtualClock.paused = state.paused
    VirtualClock._notifySubscribers()
end

return VirtualClock