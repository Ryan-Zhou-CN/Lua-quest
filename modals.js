/**
 * 模态框与通知模块
 */

let notificationId = 0;
let modalStack = [];

/**
 * 显示通知
 */
export function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationArea');
    if (!container) return;
    
    const id = ++notificationId;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.dataset.id = id;
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${escapeHtml(message)}</span>
        <button class="notification-close" aria-label="关闭">×</button>
    `;
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        removeNotification(id);
    });
    
    container.appendChild(notification);
    
    // 自动移除
    setTimeout(() => removeNotification(id), duration);
    
    return id;
}

function getNotificationIcon(type) {
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
    };
    return icons[type] || icons.info;
}

function removeNotification(id) {
    const notification = document.querySelector(`.notification[data-id="${id}"]`);
    if (notification) {
        notification.style.animation = 'slideOut 0.2s ease forwards';
        setTimeout(() => notification.remove(), 200);
    }
}

/**
 * 显示模态框
 */
export function showModal(title, content, options = {}) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">${escapeHtml(title)}</h3>
            <button class="modal-close" aria-label="关闭">×</button>
        </div>
        <div class="modal-body">
            ${typeof content === 'string' ? content : ''}
        </div>
        ${options.buttons ? `
        <div class="modal-footer">
            ${options.buttons.map(btn => `
                <button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action}">
                    ${btn.text}
                </button>
            `).join('')}
        </div>
        ` : ''}
    `;
    
    // 绑定关闭事件
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    
    // 绑定按钮事件
    if (options.buttons) {
        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (options.onAction) options.onAction(action);
                closeModal(modal);
            });
        });
    }
    
    // 点击背景关闭
    if (options.closeOnOverlay !== false) {
        container.addEventListener('click', (e) => {
            if (e.target === container) closeModal(modal);
        }, { once: true });
    }
    
    container.appendChild(modal);
    container.hidden = false;
    modalStack.push(modal);
    
    // ESC 关闭
    document.addEventListener('keydown', onModalKeydown);
    
    return modal;
}

function onModalKeydown(e) {
    if (e.key === 'Escape' && modalStack.length > 0) {
        closeModal(modalStack[modalStack.length - 1]);
    }
}

/**
 * 关闭模态框
 */
export function closeModal(modal = null) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    if (modal) {
        modal.remove();
        const idx = modalStack.indexOf(modal);
        if (idx > -1) modalStack.splice(idx, 1);
    } else if (modalStack.length > 0) {
        modalStack.pop()?.remove();
    }
    
    if (modalStack.length === 0) {
        container.hidden = true;
        container.innerHTML = '';
        document.removeEventListener('keydown', onModalKeydown);
    }
}

// 暴露到全局供 inline onclick 使用
if (typeof window !== 'undefined') {
    window.closeModal = closeModal;
}

/**
 * 显示确认对话框
 */
export function showConfirm(title, message, onConfirm, onCancel) {
    return showModal(title, `<p>${escapeHtml(message)}</p>`, {
        buttons: [
            { text: '取消', action: 'cancel', class: 'btn-secondary' },
            { text: '确定', action: 'confirm', class: 'btn-primary' },
        ],
        onAction: (action) => {
            if (action === 'confirm' && onConfirm) onConfirm();
            if (action === 'cancel' && onCancel) onCancel();
        },
    });
}

/**
 * 显示输入对话框
 */
export function showPrompt(title, message, defaultValue, onSubmit) {
    let inputValue = defaultValue || '';
    
    const modal = showModal(title, `
        <p>${escapeHtml(message)}</p>
        <input type="text" class="form-input" id="promptInput" value="${escapeHtml(defaultValue || '')}" autofocus>
    `, {
        buttons: [
            { text: '取消', action: 'cancel', class: 'btn-secondary' },
            { text: '确定', action: 'submit', class: 'btn-primary' },
        ],
        onAction: (action) => {
            if (action === 'submit') {
                const input = document.getElementById('promptInput');
                if (input && onSubmit) onSubmit(input.value);
            }
        },
    });
    
    // Enter 提交
    setTimeout(() => {
        const input = document.getElementById('promptInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const modal = document.querySelector('.modal');
                    const btn = modal?.querySelector('[data-action="submit"]');
                    btn?.click();
                }
            });
        }
    }, 0);
    
    return modal;
}

/**
 * 显示进度模态框
 */
export function showProgress(title, message, progress = 0) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    
    let modal = container.querySelector('.modal.progress-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal progress-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${escapeHtml(title)}</h3>
            </div>
            <div class="modal-body">
                <p id="progressMessage">${escapeHtml(message)}</p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill" style="width: ${progress}%"></div>
                </div>
                <span id="progressText">${progress}%</span>
            </div>
        `;
        container.appendChild(modal);
        container.hidden = false;
    } else {
        modal.querySelector('#progressMessage').textContent = message;
        modal.querySelector('#progressFill').style.width = `${progress}%`;
        modal.querySelector('#progressText').textContent = `${progress}%`;
    }
    
    return {
        update: (newProgress, newMessage) => {
            if (modal) {
                modal.querySelector('#progressFill').style.width = `${newProgress}%`;
                modal.querySelector('#progressText').textContent = `${newProgress}%`;
                if (newMessage) modal.querySelector('#progressMessage').textContent = newMessage;
            }
        },
        close: () => closeModal(modal),
    };
}

/**
 * 工具函数
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 添加通知退出动画样式
const style = document.createElement('style');
style.textContent = `
@keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
}
`;
document.head.appendChild(style);