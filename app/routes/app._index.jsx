import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ExtensionCards from "./ExtensionCard";
import InstalledScripts from "./InstalledScripts";
import { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Box,
  BlockStack,
  Divider,
  EmptyState,
} from "@shopify/polaris";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import ToolList from "./ToolList";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');
  const authenticated = url.searchParams.get('authenticated');
  const message = url.searchParams.get('message');

  // Build query string for shop parameter
  const shopQuery = shop ? `?shop=${shop}` : '';

  // Get API base URL from environment variable
  const API_BASE_URL = process.env.SHOPIFY_API_BASE_URL;

  const scriptdata = await fetch(`${API_BASE_URL}/get-scripts${shopQuery}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    }
  });

  const scripts = await scriptdata.json();

  let extensions = {};
  let product = null;

  // Fetch products from backend if shop is authenticated
  if (shop) {
    try {
      const productResponse = await fetch(`${API_BASE_URL}/get-products${shopQuery}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (productResponse.ok) {
        const productResult = await productResponse.json();
        product = productResult?.products?.[0] || null;
        console.log('Fetched product from backend:', product);
      } else {
        console.error('Failed to fetch products:', productResponse.status);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  const storeUrl = await fetch(`${API_BASE_URL}/get-store-url${shopQuery}`)
    .then((response) => response.json());

  // Check if page path exists for this shop
  const pathData = await fetch(`${API_BASE_URL}/get-page-path${shopQuery}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
    }
  });
  const pagePath = await pathData.json();

  // Fetch bookmarks for the shop
  let bookmarks = [];
  if (shop) {
    try {
      const bookmarkResponse = await fetch(`${API_BASE_URL}/manage-bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopName: shop,
          action: "get"
        })
      });

      if (bookmarkResponse.ok) {
        const bookmarkResult = await bookmarkResponse.json();
        bookmarks = bookmarkResult?.data?.titles || [];
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }

  return json({
    product,
    extensions,
    scripts,
    storeUrl,
    pagePath,
    shop,
    authenticated,
    message,
    apiBaseUrl: API_BASE_URL,
    bookmarks
  });
};

export async function generatetools(shop, apiBaseUrl) {
  if (!shop || !apiBaseUrl) {
    console.error('Shop or API base URL missing for generatetools');
    return { product: null, extensions: '{"name": "No tools available"}' };
  }

  try {
    // Get products from the backend
    const response = await fetch(`${apiBaseUrl}/get-products?shop=${shop}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch products from backend:', response.status);
      return { product: null, extensions: '{"name": "No tools available"}' };
    }

    const result = await response.json();
    const product = result?.products?.[0] || null;
    console.log('Fetched product for tool generation:', product);

    let geminiResponse = "No product found.";
    if (product) {
      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB12ODGAP2-iia9jrcA5KBARj3IZlnbHMg",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert Shopify consultant. Given the type of product sold in a Shopify store, generate one suggestion for store tools that enhance customer experience. Each suggestion should include:

    - "name": A concise and relevant name for the tool.

    Respond strictly in the following JSON format:
        {
          "name": "Extension Name",
        }
    Example: If the store sells chocolate products, one suggestion could be a "Calorie Calculator."

    Now, based on this product: ${product.title}, generate the extension suggestions and give the best tool first.
    `,
                  },
                ],
              },
            ],
          }),
        },
      );

      const geminiData = await geminiRes.json();
      geminiResponse =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";
    }
    console.log('Gemini response:', geminiResponse);

    var extensions =
      geminiResponse
        .replace(/```json\s*/g, "")
        .replace(/```/g, "")

    return { product, extensions };
  } catch (error) {
    console.error('Error in generatetools:', error);
    return { product: null, extensions: '{"name": "Error generating tools"}' };
  }
}

export default function ProductGemini() {
  const { product, scripts, storeUrl, pagePath, shop, authenticated, message, apiBaseUrl, bookmarks: initialBookmarks } = useLoaderData();
  const [bookmark, setAddBookmark] = useState(initialBookmarks || []);
  const [showPathModal, setShowPathModal] = useState(false);
  const [pagePathInput, setPagePathInput] = useState("");
  const [pendingToolName, setPendingToolName] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // Debug logging
  useEffect(() => {
    console.log('🔧 DEBUG: Component data:');
    console.log('- shop from loader:', shop);
    console.log('- storeUrl:', storeUrl);
    console.log('- authenticated:', authenticated);
    console.log('- bookmarks from loader:', initialBookmarks);
  }, [shop, storeUrl, authenticated, initialBookmarks]);

  // Function to manage bookmarks using the unified endpoint
  const manageBookmarks = async (action, title = null) => {
    const shopToUse = shop || storeUrl?.shop;

    if (!shopToUse) {
      console.error('No shop available for bookmark management');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/manage-bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopName: shopToUse,
          action,
          title
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAddBookmark(result.data.titles);
        console.log(`Bookmark ${action} successful:`, result.data.titles);
      } else {
        console.error(`Failed to ${action} bookmark:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error ${action} bookmark:`, error);
    }
  };

  useEffect(() => {
    // Show authentication success message if present
    if (authenticated && message) {
      setAuthMessage(decodeURIComponent(message));
      // Clear the message after 5 seconds
      setTimeout(() => setAuthMessage(""), 5000);
    }
  }, [authenticated, message]);

  useEffect(() => {
    if (pagePath && !pagePath.path) {
      setShowPathModal(true);
    }
  }, [pagePath]);

  // Remove localStorage related useEffects since we're using database now

  // Parse extensions array
  let extensions = [
    {
      name: "AI-Powered Style Advisor",
      description: "Recommends t-shirts based on user preferences, body type, and existing wardrobe information, enhancing personalization.",
      analytical_detail: "This tool significantly boosts conversion rates and average order value by providing personalized recommendations that align with customer tastes and body types. By collecting user data through quizzes or style profiles, the AI learns preferences and can suggest t-shirts with high probability of purchase. It also reduces returns by ensuring better fit and style satisfaction. A/B testing various recommendation algorithms and placement within the website can further optimize performance. Tracking metrics like 'recommendation click-through rate,' 'add-to-cart rate from recommendations,' and 'conversion rate of recommended items' will provide valuable insights for ongoing improvement."
    },
    {
      name: "Visual T-Shirt Customizer",
      description: "Allows customers to design their own t-shirts with custom text, images, and colors directly on the product page, driving creativity and engagement.",
      analytical_detail: "Empowering customers to design their own t-shirts increases time on site and fosters a sense of ownership, leading to higher conversion rates and customer loyalty. By visually showcasing the customization process, customers can instantly see their creations, which reduces purchase anxiety and increases the likelihood of a sale. Integrating with print-on-demand services streamlines the fulfillment process. Tracking metrics such as 'number of custom designs created,' 'conversion rate of custom designs,' and 'average order value of custom designs' will reveal its impact and areas for optimization, such as adding more design elements or customization options."
    },
    {
      name: "Fit & Size Recommendation Tool",
      description: "Helps customers find the perfect t-shirt size and fit based on their measurements and body type, reducing returns and improving satisfaction.",
      analytical_detail: "Reducing returns due to sizing issues directly improves profitability and customer satisfaction. A fit recommendation tool uses user-inputted measurements or a virtual fitting assistant to suggest the most appropriate size. By integrating with size charts and product-specific fit information, it ensures accuracy and provides detailed size recommendations. Analyzing return reasons and correlating them with size recommendations helps to refine the tool’s algorithms and improve accuracy over time. Key metrics to track include 'number of size recommendations used,' 'conversion rate of users who used the size recommendation,' and 'return rate of items purchased after using size recommendation.'"
    }
  ];

  function handleRemoveBookmark(name) {
    console.log("Removing bookmark:", name);
    manageBookmarks('remove', name);
  }

  async function handlePathSubmit() {
    if (!pagePathInput.trim()) {
      alert("Please enter a valid page path");
      return;
    }

    const shopToUse = shop || storeUrl?.shop;
    console.log('🔧 DEBUG: Saving page path');
    console.log('- shopToUse:', shopToUse);
    console.log('- path:', pagePathInput.trim());

    if (!shopToUse) {
      alert("Error: Shop information is missing. Please refresh the page.");
      return;
    }

    try {
      // Save the page path to database
      const response = await fetch(`${apiBaseUrl}/save-page-path`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: pagePathInput.trim(),
          shopName: shopToUse,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowPathModal(false);
        setPagePathInput("");
        setPendingToolName("");
      } else {
        alert("Failed to save page path. Please try again.");
      }
    } catch (error) {
      console.error("Error saving page path:", error);
      alert("An error occurred while saving the page path.");
    }

    // Add the tool to the store
    let tool = await generatetools(shopToUse, apiBaseUrl);
    let tools = JSON.parse(tool.extensions);
    await addToolToStore(tools.name || tools[0]?.name);
  }

  async function addToolToStore(toolName) {
    const shopToUse = shop || storeUrl?.shop;

    if (scripts.length >= 1) {
      console.log('🔧 DEBUG: Removing existing script');
      console.log('- shopToUse for removal:', shopToUse);

      const response = await fetch(`${apiBaseUrl}/removeToolScript`, {
        method: "POST",
        body: JSON.stringify({
          deleteScriptId: scripts[0].id.split('/').pop(),
          shop: shopToUse
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
            <Spinner size="large" />
                <p style="font-size: 18px; font-weight: bold;">Adding Tool Script...</p>
                <p style="font-size: 16px;">Please wait while we add the tool</p>
            </div>
        `;
    document.body.appendChild(modal);
    try {
      console.log('🔧 DEBUG: Adding tool script');
      console.log('- toolName:', toolName);
      console.log('- shop from loader:', shop);
      console.log('- storeUrl.shop:', storeUrl?.shop);

      const shopToUse = shop || storeUrl?.shop;
      console.log('- shopToUse:', shopToUse);

      if (!shopToUse) {
        console.error('❌ No shop parameter available');
        alert('Error: Shop information is missing. Please refresh the page.');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/addToolScript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: toolName,
          shop: shopToUse
        }),
      });
      const result = await response.json();
      console.log("Tool script added:", result);

    }
    catch (error) {
      console.error("Error adding tool script:", error);
    } finally {
      window.location.reload();
      document.body.removeChild(modal);
    }
  }

  return (
    <Page title="Store Analyzer">
      {/* Authentication Success Message */}
      {authMessage && (
        <div style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🎉 {authMessage}
          {shop && (
            <div style={{ marginTop: '5px', fontSize: '14px' }}>
              Connected to: {shop}
            </div>
          )}
        </div>
      )}
      <BlockStack gap="600">
        <Layout>
          <Layout.Section>
            <Card padding={"0"}>
              <div style={{ backgroundColor: '#CDB4DB', padding: '20px', color: "#303030", fontWeight: 'bold' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Installed Tool</Text>
                  <InstalledScripts scripts={scripts} storeUrl={storeUrl} shop={shop} apiBaseUrl={apiBaseUrl} />
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card padding={"0"}>
              <div style={{ padding: '20px', backgroundColor: '#F0F4C3', color: '#303030' }}>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Analytics</Text>
                  <ToolList />
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <Card padding={"0"}>
              <div style={{ backgroundColor: '#88D4AB', padding: '20px', color: "#303030" }}>
                <BlockStack gap="400">
                  <Box paddingBlockEnd="300">
                    <BlockStack gap="200">
                      <Text as="h2" variant="headingLg" ><p style={{ fontWeight: 'bold' }}>Store Enhancement Tools</p></Text>
                      <Text as="p" variant="bodyMd">
                        AI-powered suggestions to improve your store's performance and customer experience
                      </Text>
                    </BlockStack>
                  </Box>

                  {product ? (
                    <BlockStack gap="400">
                      <Box>
                        <span style={{ backgroundColor: '#00a197', padding: '5px 10px', borderRadius: '20px' }}>
                          Product Analysis: {product.title}
                        </span>
                      </Box>
                      <ExtensionCards
                        bookmark={bookmark}
                        manageBookmarks={manageBookmarks}
                        scripts={scripts}
                        shop={shop || storeUrl?.shop}
                        addToolToStore={addToolToStore}
                        apiBaseUrl={apiBaseUrl}
                      />
                    </BlockStack>
                  ) : (
                    <EmptyState
                      heading="No products found"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Add products to your store to get AI-powered tool recommendations</p>
                      {!shop && (
                        <p style={{ marginTop: '10px', color: '#666' }}>
                          Please authenticate your store first to access product data
                        </p>
                      )}
                    </EmptyState>
                  )}
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>

          {bookmark.length > 0 && (
            <Layout.Section secondary>
              <Card padding={"0"}>
                <div style={{ padding: '20px', background: '#64B5F6', color: '#303030' }}>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Your Bookmarks</Text>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {bookmark.map((name) => (
                        <Box key={name}>
                          <div style={{ padding: '10px', background: '#90CAF9', borderRadius: '5px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: 120 }}>
                            <Text variant="bodyMd" fontWeight="semibold">{name}</Text>
                            <input type="hidden" name="name" value={name} />
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                              <button type="submit" style={{ backgroundColor: "#1976D2", color: "#f1f1f1", border: 'none', padding: '8px 11px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => addToolToStore(name)}>Add to Store</button>
                              <button style={{ color: "#f1f1f1", backgroundColor: "#0D47A1", border: 'none', padding: '8px 11px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleRemoveBookmark(name)}><FontAwesomeIcon icon={faTrashCan} /></button>
                            </div>
                          </div>
                        </Box>
                      ))}
                    </div>
                  </BlockStack>
                </div>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>

      {/* Page Path Collection Modal */}
      {
        showPathModal && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#2d3748'
              }}>
                Configure Tool Installation Path
              </h3>

              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: '#4a5568',
                lineHeight: '1.5'
              }}>
                Please enter the page path where you want to add the tool:
              </p>

              <input
                type="text"
                value={pagePathInput}
                onChange={(e) => setPagePathInput(e.target.value)}
                placeholder="Enter page path (e.g., products)"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '20px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowPathModal(false);
                    setPagePathInput("");
                    setPendingToolName("");
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#4a5568',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f7fafc';
                    e.target.style.borderColor = '#cbd5e0';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handlePathSubmit}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Save & Continue
                </button>
              </div>
            </div>
          </div>
        )
      }
    </Page >
  );
}
