import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye as faEyeSolid } from '@fortawesome/free-solid-svg-icons';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';

export default function InstalledScripts({ scripts, storeUrl, shop, apiBaseUrl }) {

  function extractNameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const name = params.get("name");
      return name ? decodeURIComponent(name) : "Unknown Script";
    } catch {
      return "Unknown Script";
    }
  }

  if (scripts.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state">
          <img
            src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            alt="No scripts"
            className="empty-state-image"
          />
          <h2>No tool installed</h2>
          <p>Choose a tool from the recommendations below to install it in your store</p>
        </div>
      </div>
    );
  }

  async function handleRemoveScript(scriptId) {
    //create a modal to display loading state
    const modal = document.createElement('div');
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
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h2>Removing Script...</h2>
            <p>Please wait while we remove the script from your store.</p>
            <div class="spinner-container" style="width:100%; display: flex; justify-content: center; align-items: center; margin-top: 20px;">
              <div class="spinner" style="border: 4px solid rgba(0, 0, 0, 0.1); border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; align-self: center;"></div>
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
          }
          </style>
        `;
    document.body.appendChild(modal);
    const response = await fetch(`${apiBaseUrl}/removeToolScript`, {
      method: "POST",
      body: JSON.stringify({ deleteScriptId: scriptId, shop: shop }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (data.success) {
      modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2>Script Removed</h2>
          <p>The script has been successfully removed from your store.</p>
        </div>
      `;

    } else {
      modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2>Error Removing Script</h2>
          <p>There was an error removing the script from your store. Please try again later.</p>
        </div>
      `;

    }

    // Remove the modal after 2 seconds
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 2000);

    scripts = []
  }

  return (
    <div className="scripts-table-container">
      <table className="scripts-table">
        <thead>
          <tr>
            <th>Tool Name</th>
            <th>Script ID</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scripts.map((script) => (
            <tr key={script.id} className="script-row">
              <td>{extractNameFromUrl(script.src)}</td>
              <td>
                <span className="script-id">{script.id.split('/').pop()}</span>
              </td>
              <td>
                <div className="script-actions" style={{ justifyContent: 'center' }}>
                  <a style={{ backgroundColor: "#FFC8DD" }}
                    href={storeUrl.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-button"
                  >
                    <FontAwesomeIcon icon={faEyeSolid} color="#303030" />
                  </a>
                  <button style={{ backgroundColor: "#FFAFCC", color: "#303030", border: 'none', padding: '8px 11px', borderRadius: '4px', cursor: 'pointer' }} className="remove-button"
                    onClick={() => {
                      handleRemoveScript(script.id.split('/').pop());
                    }}>
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style dangerouslySetInnerHTML={{
        __html: `
        .scripts-table-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        .scripts-table {
          width: 100%;
          overflow: hidden;
        }
        
        .scripts-table thead {
          background-color: #transparent;
        }
        
        .scripts-table th {
          text-align: left;
          padding: 16px;
          font-weight: 600;
        }
        
        .scripts-table td {
          padding: 16px;
          border-top: 1px solid #f4f6f8;
        }
        
        .script-id {
          font-family: monospace;
          font-size: 13px;
        }
        
        .script-actions {
          display: flex;
          gap: 10px;
        }
        
        .view-button, .remove-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          min-width: 36px;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .view-button {
          background-color: #6320EE;
          color: #303030
        }
        
        .remove-button {
          background-color: #d82c0d;
          color: #303030;
          border: none;
        }
        
        .remove-button:disabled {
          background-color: #f4f6f8;
          color: #919eab;
          border-color: #c4cdd5;
          cursor: not-allowed;
        }
        
        .empty-state-container {
          padding: 32px;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 32px;
          background-color: #f4f6f8;
          border-radius: 8px;
        }
        
        .empty-state-image {
          width: 140px;
          height: 140px;
          margin-bottom: 20px;
        }
        
        .empty-state h2 {
          margin-bottom: 8px;
          color: #212b36;
          font-weight: 600;
        }
        
        .empty-state p {
          color: #637381;
          max-width: 400px;
        }
      `}} />
    </div>
  );
}