import React from 'react';
import ReactDOM from 'react-dom';
import './DetailsModal.css'; // External CSS for clean JSX
import svg from "../../assets/loading.svg";

const DetailModal = ({ ext, onClose, shop, scripts, apiBaseUrl }) => {
    if (!ext) return null;

    const { name, description, analytical_detail: detail } = ext;
    async function handleAddTool(toolName) {
        console.log('🔧 DEBUG: ExtensionCard handleAddTool');
        console.log('- toolName:', toolName);

        if (!shop) {
            console.error('❌ No shop parameter in ExtensionCard');
            alert('Error: Shop information is missing. Please refresh the page.');
            return;
        }

        if (scripts.length >= 1) {
            const response = await fetch(`${apiBaseUrl}/removeToolScript`, {
                method: "POST",
                body: JSON.stringify({
                    deleteScriptId: scripts[0].id.split('/').pop(),
                    shop: shop
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();
            if (data.success) {
                console.log("Tool script removed:", data);
            }
        }

        //create a modal to display loading state
        console.log("Adding tool script:", toolName);
        const modal = document.createElement('div');
        modal.id = 'loading-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 5px; text-align: center;">
    <img src='${svg}' alt="Loading..." style="width: 50px; height: 50px; margin-bottom: 10px;">
    <p style="font-size: 18px; font-weight: bold;">Adding Tool...</p>
    <p style="font-size: 16px;">Please wait while we add the tool</p>
</div>`;
        document.body.appendChild(modal);
        try {
            const response = await fetch(`${apiBaseUrl}/addToolScript`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: toolName,
                    shop: shop
                }),
            });
            const result = await response.json();
            console.log("Tool script added:", result.message);
            // create a popup to display whether to redirect or not
            modal.innerHTML = `
                <div id="loading-modal" style="background: rgba(0, 0, 0, 0.4); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center;">
  <div style="background: white; padding: 30px 25px; border-radius: 10px; text-align: center; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); max-width: 400px; width: 90%;">
    
    <!-- Optional success icon -->
    <div style="font-size: 40px; color: #2ecc71; margin-bottom: 25px;">✔️</div>
    
    <p style="font-size: 20px; font-weight: 600; color: #333; margin-bottom: 10px;">Tool Added Successfully!</p>
    <p style="font-size: 16px; color: #555; margin-bottom: 25px;">You can now use the tool in your store.</p>
    
    <a href="${result.shopUrl}" target="_blank"
       style="display: inline-block; background-color: #14746F; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; transition: background-color 0.3s;">
      Go to Store
    </a>
    
    <br><br>
    
    <button id="close-btn"
            onclick="window.location.reload(); document.getElementById('loading-modal').remove();"
            style="margin-top: 10px; background: none; border: none; color: #888; font-size: 14px; cursor: pointer;">
      Close
    </button>
  </div>
</div>
`;
        }
        catch (error) {
            console.error("Error adding tool script:", error);
        }
    }

    return ReactDOM.createPortal(
        <div className="detail-modal">
            <div id="product-card">
                {/* Header */}
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <h2>{name}</h2>
                    <p>Tool</p>
                </div>

                {/* Content */}
                <div className="modal-content">
                    <div className="section">
                        <h3>
                            <i className="fa-solid fa-info-circle"></i>
                            Description
                        </h3>
                        <p>{description}</p>
                    </div>
                    <div className="section">
                        <h3>
                            <i className="fa-solid fa-chart-line"></i>
                            Key Features
                        </h3>
                        <p>{detail}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="add-btn" onClick={() => handleAddTool(name)}>
                        <i className="fa-solid fa-cart-plus"></i>
                        Add to Store
                    </button>
                </div>
            </div>
        </div >,
        document.body
    );
};

export default DetailModal;
