// Notification bell — uses /api/v1/notifications/user/{id}
// Fetches at startup and every 60 s; popover lists items, click to mark read.

let cachedUserId = null;
let pollHandle = null;

function fmtTime(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "vừa xong";
        if (mins < 60) return `${mins} phút trước`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} giờ trước`;
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) { return ""; }
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
}

async function fetchAndRender() {
    if (!cachedUserId) return;
    try {
        const res = await fetch(`/api/v1/notifications/user/${cachedUserId}`);
        if (!res.ok) return;
        const list = await res.json();
        renderList(list);
    } catch (e) {
        // silent — non-critical
    }
}

function renderList(items) {
    const badge = document.getElementById("notif-badge");
    const listEl = document.getElementById("notif-list");
    if (!badge || !listEl) return;

    // Newest first
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const unread = items.filter(i => !i.isRead && !i.read).length;

    if (unread > 0) {
        badge.hidden = false;
        badge.textContent = unread > 99 ? "99+" : String(unread);
    } else {
        badge.hidden = true;
    }

    if (!items.length) {
        listEl.innerHTML = `<div class="notif-empty">Chưa có thông báo nào.</div>`;
        return;
    }

    listEl.innerHTML = "";
    items.forEach(n => {
        const isRead = n.isRead || n.read;
        const row = document.createElement("div");
        row.className = "notif-item" + (isRead ? " is-read" : "");
        row.innerHTML = `
            <div class="notif-item-title">${escapeHtml(n.title || "Thông báo")}</div>
            <div class="notif-item-body">${escapeHtml(n.content || "")}</div>
            <div class="notif-item-time">${fmtTime(n.createdAt)}</div>`;
        row.addEventListener("click", async () => {
            if (isRead) return;
            try {
                await fetch(`/api/v1/notifications/${n.id}/read`, { method: "PUT" });
                fetchAndRender();
            } catch (e) {}
        });
        listEl.appendChild(row);
    });
}

async function markAllRead() {
    if (!cachedUserId) return;
    const listEl = document.getElementById("notif-list");
    if (!listEl) return;
    try {
        const res = await fetch(`/api/v1/notifications/user/${cachedUserId}`);
        if (!res.ok) return;
        const items = await res.json();
        const unread = items.filter(n => !(n.isRead || n.read));
        await Promise.all(unread.map(n =>
            fetch(`/api/v1/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {})
        ));
        fetchAndRender();
    } catch (e) {}
}

export function initNotifications() {
    const user = window.AuthUtil ? window.AuthUtil.getUser() : null;
    if (!user || !user.id) return;
    cachedUserId = user.id;

    const bell = document.getElementById("notif-bell");
    const pop = document.getElementById("notif-popover");
    const markAllBtn = document.getElementById("notif-mark-all");
    if (!bell || !pop) return;

    bell.addEventListener("click", (e) => {
        e.stopPropagation();
        pop.hidden = !pop.hidden;
        if (!pop.hidden) fetchAndRender();
    });

    document.addEventListener("click", (e) => {
        if (!pop.hidden && !pop.contains(e.target) && !bell.contains(e.target)) {
            pop.hidden = true;
        }
    });

    markAllBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        markAllRead();
    });

    fetchAndRender();
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = setInterval(fetchAndRender, 60000);
}
