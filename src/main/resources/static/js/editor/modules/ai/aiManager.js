import { updateCanvasItem, state } from "../state.js";
import { renderApp } from "../index.js";
import { renderViewer } from "../viewer.js";

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
    if (item.type !== 'image' && item.type !== 'video') return;
    
    // We need the file blob to send. If src is a url, we need to fetch it first.
    showAiLoading("✨ AI đang tách nền...");
    
    try {
        const response = await fetch(item.src);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob, "image.png");
        
        const aiResponse = await fetch('/api/editor/ai/remove-bg', {
            method: 'POST',
            body: formData
        });
        
        if (!aiResponse.ok) {
            throw new Error("AI Worker failed");
        }
        
        const resultBlob = await aiResponse.blob();
        const objectUrl = URL.createObjectURL(resultBlob);
        
        updateCanvasItem(item.instanceId, { src: objectUrl }, true);
        renderApp();
    } catch (e) {
        console.error(e);
        showToast("🤖 AI xử lý thất bại, vui lòng thử lại sau");
    } finally {
        hideAiLoading();
    }
}

export async function detectAndBlurFaces(item) {
    if (item.type !== 'image' && item.type !== 'video') return;
    
    showAiLoading("🕵️‍♂️ AI đang dò tìm khuôn mặt...");
    
    try {
        const response = await fetch(item.src);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob, "image.png");
        
        const aiResponse = await fetch('/api/editor/ai/detect-faces', {
            method: 'POST',
            body: formData
        });
        
        if (!aiResponse.ok) {
            throw new Error("AI Worker failed");
        }
        
        const data = await aiResponse.json();
        
        if (data.faces && data.faces.length > 0) {
            // Need to convert image coordinates to canvas coordinates
            // This is a simplified approach, creating rects over the image
            const scaleX = item.width / item.naturalWidth;
            const scaleY = item.height / item.naturalHeight;
            
            data.faces.forEach(face => {
                const blurRect = {
                    instanceId: 'blur_' + Date.now() + Math.random(),
                    type: 'shape',
                    shapeType: 'rectangle',
                    x: item.x + (face.x * scaleX),
                    y: item.y + (face.y * scaleY),
                    width: face.width * scaleX,
                    height: face.height * scaleY,
                    rotation: item.rotation,
                    fillColor: 'rgba(0,0,0,1)',
                    filters: { blur: 20 },
                    zIndex: state.items.length
                };
                state.items.push(blurRect);
            });
            renderApp();
        } else {
            showToast("Không tìm thấy khuôn mặt nào.");
        }
        
    } catch (e) {
        console.error(e);
        showToast("🤖 AI xử lý thất bại, vui lòng thử lại sau");
    } finally {
        hideAiLoading();
    }
}
