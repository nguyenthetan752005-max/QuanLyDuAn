import { updateCanvasItem, state } from "../state.js";
import { renderApp } from "../ui/index.js";
import { renderViewer } from "../ui/viewer.js";
import { refreshEditorExplorer } from "../ui/explorer.js";

// Utility to show loading overlay on canvas
function showAiLoading(message) {
    let overlay = document.getElementById('ai-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ai-loading-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.color = 'white';
        overlay.style.backdropFilter = 'blur(4px)';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.marginBottom = '12px';
        
        const text = document.createElement('div');
        text.id = 'ai-loading-text';
        text.style.fontWeight = '500';
        text.style.fontSize = '14px';
        
        overlay.appendChild(spinner);
        overlay.appendChild(text);
        
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(overlay);
        }
    }
    document.getElementById('ai-loading-text').textContent = message;
    overlay.style.display = 'flex';
}

function hideAiLoading() {
    const overlay = document.getElementById('ai-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showToast(msg) {
    // A simple toast using existing UI or alert
    alert(msg); // Fallback to alert if no toast system
}

export async function removeBackground(item) {
    if (item.type !== 'image') return;
    
    // We need the file blob to send. If src is a url, we need to fetch it first.
    showAiLoading("✨ AI đang tách nền...");
    
    try {
        let imgUrl = item.src;
        if (!imgUrl && item.tabId) {
            const tab = state.tabs.find(t => t.id === item.tabId);
            imgUrl = tab ? (tab.localUrl || tab.url) : null;
        }
        
        if (!imgUrl) {
            throw new Error("Không tìm thấy đường dẫn ảnh.");
        }
        
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob, "image.png");
        
        const aiResponse = await fetch('/api/editor/ai/remove-bg', {
            method: 'POST',
            body: formData
        });
        
        if (aiResponse.status === 401) {
            throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.");
        }
        if (!aiResponse.ok) {
            throw new Error("AI Worker failed");
        }
        
        const resultBlob = await aiResponse.blob();
        const objectUrl = URL.createObjectURL(resultBlob);
        
        // Mở hộp thoại chọn thư mục lưu thay vì hỏi
        showSaveModal(resultBlob, "ai_removed_bg_" + Date.now() + ".png", (newObjectUrl) => {
            // Khi lưu thành công, cập nhật ảnh trên Canvas
            updateCanvasItem(item.instanceId, { src: newObjectUrl }, true);
            renderApp();
            showToast("✨ Đã thay thế bằng ảnh tách nền!");
        });
        
    } catch (e) {
        console.error(e);
        showToast(e.message || "🤖 AI xử lý thất bại, vui lòng thử lại sau");
    } finally {
        hideAiLoading();
    }
}

export async function detectAndBlurFaces(item) {
    if (item.type !== 'image') return;
    
    showAiLoading("🕵️‍♂️ AI đang dò tìm khuôn mặt...");
    
    try {
        let imgUrl = item.src;
        if (!imgUrl && item.tabId) {
            const tab = state.tabs.find(t => t.id === item.tabId);
            imgUrl = tab ? (tab.localUrl || tab.url) : null;
        }
        
        if (!imgUrl) {
            throw new Error("Không tìm thấy đường dẫn ảnh.");
        }
        
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob, "image.png");
        
        const aiResponse = await fetch('/api/editor/ai/detect-faces', {
            method: 'POST',
            body: formData
        });
        
        if (aiResponse.status === 401) {
            throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.");
        }
        if (!aiResponse.ok) {
            throw new Error("AI Worker failed");
        }
        
        const data = await aiResponse.json();
        
        if (data.faces && data.faces.length > 0) {
            // Xóa các hình khối mờ trước đó của ảnh này
            state.canvasItems = state.canvasItems.filter(ci => ci.aiGeneratedFor !== item.instanceId);
            
            // Need to convert image coordinates to canvas coordinates
            const scaleX = item.width / item.naturalWidth;
            const scaleY = item.height / item.naturalHeight;
            
            data.faces.forEach((face, index) => {
                const blurRect = {
                    instanceId: 'blur_' + Date.now() + Math.random().toString().substr(2,9),
                    type: 'shape',
                    shapeType: 'rectangle',
                    x: item.x + (face.x * scaleX) - 10,
                    y: item.y + (face.y * scaleY) - 10,
                    width: (face.width * scaleX) + 20,
                    height: (face.height * scaleY) + 20,
                    rotation: item.rotation,
                    fillColor: 'transparent',
                    backdropBlur: 15,
                    aiGeneratedFor: item.instanceId,
                    zIndex: (item.zIndex || 0) + 1 + index
                };
                state.canvasItems.push(blurRect);
            });
            renderApp();
        } else {
            showToast("Không tìm thấy khuôn mặt nào.");
        }
        
    } catch (e) {
        console.error(e);
        showToast(e.message || "🤖 AI xử lý thất bại, vui lòng thử lại sau");
    } finally {
        hideAiLoading();
    }
}

export async function flattenAndSaveBlur(item) {
    if (item.type !== 'image') return;
    showAiLoading("Đang xuất ảnh...");
    
    // Tìm các hình khối mờ trên canvas nằm TRÊN bức ảnh này
    const blurShapes = state.canvasItems.filter(s => 
        s.type === 'shape' && 
        s.backdropBlur > 0 && 
        (s.zIndex || 0) > (item.zIndex || 0)
    );
    
    if (blurShapes.length === 0) {
        hideAiLoading();
        alert("Không có khối làm mờ nào nằm trên bức ảnh này.");
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        // Giới hạn kích thước tối đa để chống tràn RAM (ví dụ 4000px)
        const MAX_DIM = 4000;
        let nw = item.naturalWidth || item.width;
        let nh = item.naturalHeight || item.height;
        if (nw > MAX_DIM || nh > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / nw, MAX_DIM / nh);
            nw = Math.floor(nw * ratio);
            nh = Math.floor(nh * ratio);
        }

        canvas.width = nw;
        canvas.height = nh;
        
        const scaleX = nw / item.width;
        const scaleY = nh / item.height;

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        let src = item.src;
        if (!src && item.tabId) {
            const tabEl = document.querySelector(`[data-tab-activate="${item.tabId}"]`);
            if (tabEl) src = tabEl.dataset.filepath || tabEl.dataset.url;
        }

        img.onload = () => {
            // Vẽ ảnh gốc
            ctx.drawImage(img, 0, 0, nw, nh);
            
            // Vẽ từng khối mờ đè lên
            blurShapes.forEach(shape => {
                ctx.save();
                ctx.beginPath();
                
                const localX = (shape.x - item.x) * scaleX;
                const localY = (shape.y - item.y) * scaleY;
                const localW = shape.width * scaleX;
                const localH = shape.height * scaleY;

                if (shape.shapeType === 'circle') {
                    ctx.ellipse(
                        localX + localW/2, 
                        localY + localH/2,
                        localW/2, localH/2,
                        0, 0, 2*Math.PI
                    );
                } else {
                    ctx.rect(localX, localY, localW, localH);
                }
                
                ctx.clip();
                ctx.filter = `blur(${shape.backdropBlur * ((scaleX+scaleY)/2)}px)`;
                ctx.drawImage(img, 0, 0, nw, nh);
                ctx.restore();
            });

            // Chuyển canvas thành blob và gọi hộp thoại lưu
            canvas.toBlob(blob => {
                hideAiLoading();
                showSaveModal(blob, "ai_blurred_" + Date.now() + ".png", (newObjectUrl) => {
                    updateCanvasItem(item.instanceId, { src: newObjectUrl }, true);
                    const shapeIds = blurShapes.map(s => s.instanceId);
                    state.canvasItems = state.canvasItems.filter(ci => !shapeIds.includes(ci.instanceId));
                    renderApp();
                    showToast("✨ Đã thay thế bằng ảnh đã làm mờ!");
                });
            }, 'image/png');
        };
        
        img.onerror = () => {
            hideAiLoading();
            alert("Lỗi tải ảnh nguồn để xuất.");
        };
        img.src = src;
    } catch (e) {
        console.error(e);
        hideAiLoading();
        alert("Lỗi khi xuất ảnh: " + e.message);
    }
}

export async function showSaveModal(blob, defaultFilename, onSuccess) {
    // Tự tạo modal HTML
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';

    const modal = document.createElement('div');
    modal.style.backgroundColor = 'var(--surface-color, #1e1e1e)';
    modal.style.borderRadius = '8px';
    modal.style.padding = '24px';
    modal.style.width = '400px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    modal.style.color = 'var(--text-color, #ffffff)';
    modal.style.fontFamily = 'var(--font-family, Inter, sans-serif)';

    const title = document.createElement('h3');
    title.textContent = "Lưu ảnh AI";
    title.style.margin = '0 0 16px 0';

    const label = document.createElement('div');
    label.textContent = "Chọn thư mục lưu (Tệp tin):";
    label.style.fontSize = '14px';
    label.style.marginBottom = '8px';
    label.style.color = 'var(--text-muted, #aaa)';

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '10px';
    select.style.borderRadius = '4px';
    select.style.backgroundColor = 'var(--bg-color, #121212)';
    select.style.color = 'white';
    select.style.border = '1px solid var(--border-color, #333)';
    select.style.marginBottom = '20px';

    const rootOption = document.createElement('option');
    rootOption.value = 'root';
    rootOption.textContent = "Thư mục gốc (Root)";
    select.appendChild(rootOption);

    // Fetch folders
    try {
        const res = await fetch('/api/v1/media-folders?isDeleted=false');
        if (res.ok) {
            const folders = await res.json();
            folders.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error("Error fetching folders", e); }

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = "Hủy";
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.border = '1px solid #555';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.color = 'white';
    cancelBtn.style.cursor = 'pointer';
    
    // Đóng modal khi bấm Esc
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escHandler);
    };

    const saveBtn = document.createElement('button');
    saveBtn.textContent = "Lưu ảnh";
    saveBtn.className = "btn btn-primary";
    saveBtn.style.padding = '8px 16px';
    saveBtn.style.borderRadius = '4px';
    saveBtn.style.border = 'none';
    saveBtn.style.backgroundColor = '#BB86FC';
    saveBtn.style.color = '#000';
    saveBtn.style.cursor = 'pointer';
    saveBtn.onclick = async () => {
        saveBtn.textContent = "Đang lưu...";
        saveBtn.disabled = true;
        
        const file = new File([blob], defaultFilename, { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);
        if (select.value !== 'root') {
            formData.append("folderId", select.value);
        }

        try {
            const uploadRes = await fetch("/api/v1/media-assets/upload", {
                method: "POST",
                body: formData
            });
            if (uploadRes.ok) {
                const data = await uploadRes.json();
                document.body.removeChild(overlay);
                refreshEditorExplorer();
                
                // Gọi callback onSuccess truyền vào blob url mới để render canvas
                const newObjectUrl = URL.createObjectURL(blob);
                if (onSuccess) onSuccess(newObjectUrl);
            } else {
                alert("Lỗi khi lưu ảnh AI");
                saveBtn.textContent = "Lưu ảnh";
                saveBtn.disabled = false;
            }
        } catch (err) {
            console.error("Lỗi khi lưu ảnh AI:", err);
            alert("Lỗi khi lưu ảnh AI");
            saveBtn.textContent = "Lưu ảnh";
            saveBtn.disabled = false;
        }
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    modal.appendChild(title);
    modal.appendChild(label);
    modal.appendChild(select);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
