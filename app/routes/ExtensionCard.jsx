import {
    Button,
    Card,
    Text,
    BlockStack,
    InlineStack,
    Box,
    Grid,
    Spinner
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import DetailModal from "./Details/Details";
import svg from "../assets/loading.svg";

export default function ExtensionCards({ bookmark, manageBookmarks, scripts, shop, addToolToStore, apiBaseUrl }) {

    const [response, setResponse] = useState([
        {
            name: "AI-Powered Style Advisor",
            description: "Recommends t-shirts based on user preferences body type and existing wardrobe information enhancing personalization.",
            analytical_detail: "<b>+20–35%</b> conversion rate <b>+25–45%</b> AOV <b>–15–25%</b> return rate <b>25–40%</b> recommendation CTR"
        },
        {
            name: "Visual T-Shirt Customizer",
            description: "Allows customers to design their own t-shirts with custom text images and colors directly on the product page driving creativity and engagement.",
            analytical_detail: "<b>+15–30%</b> conversion rate <b>+20–35%</b> AOV <b>–35–55%</b> return rate <b>+60–120%</b> time on site"
        },
        {
            name: "Fit & Size Recommendation Tool",
            description: "Helps customers find the perfect t-shirt size and fit based on their measurements and body type reducing returns and improving satisfaction.",
            analytical_detail: "<b>–30–45%</b> return rate <b>+12–25%</b> conversion rate <b>–60%</b> size-related inquiries <b>50–70%</b> tool engagement"
        }
    ]);
    const [loading, setLoading] = useState(false);

    // if (response.length === 0) {
    //     generatetools();
    // }

    // Check if extensions are already stored in localStorage
    useEffect(() => {
        const storedExtensions = localStorage.getItem("extensions");
        if (storedExtensions && storedExtensions !== "No response") {
            setResponse(JSON.parse(storedExtensions).extensions);
        }
    }, []);

    async function generatetools() {
        setLoading(true);
        console.log("Generating tools...");
        const endpoint = `https://promotional-banner-test.myshopify.com/api/2024-01/graphql.json`;
        const token = "08b3fb76f7160841c616099154abf2dc";

        const query = `
      {
        products(first: 1) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "X-Shopify-Storefront-Access-Token": token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        });

        const result = await response.json();
        const product = result?.data?.products?.edges?.[0]?.node;

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
                                        text: `I want to enhance my Shopify product pages by embedding helpful calculator tools that assist customers in making purchase decisions or understanding product usage.

Here is the product information:

Product Title: ${product.title}

Briefly give each idea a catchy title and a one-sentence description.”
  - "name": A concise and relevant name for the tool.
  - "description": A one-sentence description of what the tool does.
  - "analytical_detail": A detailed explanation of how this tool improves store performance, user engagement, or conversion rate.

  Respond strictly in the following JSON format:
  {
    "extensions": [
      {
        "name": "Extension Name",
        "description": "One-sentence description of the extension.",
        "analytical_detail": "Detailed explanation of how it improves store performance or UX."
      },
      ...
      (Total: 3 suggestions)
    ]
  }`,
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

        var extensions =
            geminiResponse
                .replace(/```json\s*/g, "")
                .replace(/```/g, "")

        console.log("Gemini Response:", extensions);
        //store the response in localStorage
        localStorage.setItem("extensions", extensions);
        if (extensions.extensions !== "No response") {
            setResponse(JSON.parse(extensions).extensions || []);
        } else {
            alert("Please try again")
        }
        setLoading(false);
        return true;
    }

    return (
        <BlockStack gap="400">
            <Box paddingBlockEnd="300">
                <button onClick={generatetools} style={{ backgroundColor: '#14746F', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    <p style={{ color: '#f1f1f1', fontSize: '16px', fontWeight: 'bold' }}>Generate New Recommendations</p>
                </button>
            </Box>

            {loading ? (
                <div style={{
                    width: '100%', textAlign: 'center',
                    alignContent: 'center',
                    height: '200px',
                    borderRadius: '10px',
                    border: '1px solid #14746F',
                }}>
                    < Spinner />
                    <Text variant="bodyMd" as="p">Generating recommendations...
                    </Text>
                </div>
            ) : (
                <>
                    <Grid>
                        {response.map((ext, idx) => (
                            <Grid.Cell key={ext.name || idx} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4 }}>
                                <ExtensionCard extension={ext} bookmark={bookmark} manageBookmarks={manageBookmarks} scripts={scripts} shop={shop} apiBaseUrl={apiBaseUrl} />
                            </Grid.Cell>
                        ))}
                    </Grid>
                </>
            )}
        </BlockStack >
    );
}

function ExtensionCard({ extension: ext, bookmark, manageBookmarks, scripts, shop, apiBaseUrl }) {

    const [showModal, setShowModal] = useState(false);

    async function handleAddTool(toolName) {
        console.log('🔧 DEBUG: ExtensionCard handleAddTool');
        console.log('- toolName:', toolName);
        console.log('- shop prop:', shop);

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

    function handleDetail() {
        const name = ext.name;
        const description = ext.description;
        const detail = ext.analytical_detail;
        const modal = document.createElement('div');
        modal.id = 'detail-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.padding = '100px';
        modal.innerHTML = `
            <div id="product-card" style="background: #ffffff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); overflow: hidden; width: 100%; max-width: 600px; position: relative; transition: transform 0.3s ease, box-shadow 0.3s ease; animation: fadeInUp 0.6s ease-out;" 
        
        <!-- Product Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; position: relative;">
            <button onclick="document.getElementById('detail-modal').remove();" 
                    style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.3s ease;"
                    onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                    onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.2;">${name}</h2>
            <p style="font-size: 14px; opacity: 0.9; font-weight: 400; margin: 0;">Tool</p>
        </div>
        
        <!-- Product Content -->
        <div style="padding: 28px 24px;">
            <div style="margin-bottom: 24px;">
                <h3 style="font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-info-circle" style="color: #667eea; font-size: 14px;"></i>
                    Description
                </h3>
                <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0;">
                    ${description}
                </p>
            </div>
            
            <div style="margin-bottom: 0;">
                <h3 style="font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-chart-line" style="color: #667eea; font-size: 14px;"></i>
                    Key Features
                </h3>
                <p style="font-size: 14px; line-height: 1.6; color: #4a5568; margin: 0;">
                    ${detail}
                </p>
            </div>
        </div>
        
        <!-- Product Footer -->
        <div style="padding: 0 24px 24px;">
            <button id="add-btn"  
                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-size: 14px; display: flex; align-items: center; gap: 8px;"
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 16px rgba(102, 126, 234, 0.3)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                    onmousedown="this.style.transform='translateY(0)'">
                <i class="fa-solid fa-cart-plus"></i>
                Add to Store
            </button>
        </div>
    </div>

    <style>
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Responsive styles */
        @media (max-width: 480px) {
            body {
                padding: 10px !important;
            }
            
            #product-card {
                max-width: 100% !important;
            }
            
            #product-card > div:first-child {
                padding: 20px !important;
            }
            
            #product-card > div:first-child h2 {
                font-size: 20px !important;
            }
            
            #product-card > div:nth-child(2) {
                padding: 20px !important;
            }
            
            #product-card > div:last-child {
                padding: 0 20px 20px !important;
                flex-direction: column !important;
                gap: 16px;
            }
            
            #add-btn {
                width: 100% !important;
                justify-content: center !important;
            }
        }
    </style>
        `;
        document.body.appendChild(modal);
    }

    const [bookmarked, setBookmarked] = useState(false);

    useEffect(() => {
        setBookmarked(bookmark.includes(ext.name));
    }, [bookmark, ext.name]);

    function handleBookmark() {
        if (bookmarked) {
            // Remove bookmark
            manageBookmarks('remove', ext.name);
        } else {
            // Add bookmark
            manageBookmarks('add', ext.name);
        }
        setBookmarked((prev) => !prev);
    }

    return (
        <Card padding={"0"}>
            <div style={{ backgroundColor: '#56AB91', padding: '20px' }}>
                <BlockStack gap="400" >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexDirection: 'column',
                        height: '150px',
                    }}>

                        <InlineStack wrap={false} align="space-between" gap="200">
                            <Text variant="bodyMd" as="p" fontWeight="bold">
                                {ext.name}
                            </Text>
                            <button onClick={handleBookmark} style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                outline: 'none',
                            }}>
                                {bookmarked ? (
                                    <FontAwesomeIcon icon={faStarSolid} style={{ color: '#FFD700', fontSize: '20px' }} />
                                ) : (
                                    <FontAwesomeIcon icon={faStarRegular} style={{ color: '#FFD700', fontSize: '20px' }} />
                                )}
                            </button>
                        </InlineStack>

                        <Text variant="bodyMd">{ext.description}</Text>

                        <InlineStack wrap={false} align="space-between" gap="200">
                            <button id="add-btn" style={{ backgroundColor: "#14746F", color: "#f1f1f1", border: 'none', padding: '8px 11px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleAddTool(ext.name)}>
                                Add to Store
                            </button>
                            {/* <Button
                                onClick={handleDetail}
                            >
                                Show details
                            </Button> */}
                            <Button onClick={() => setShowModal(true)}>Open Detail</Button>
                            {showModal && (
                                <DetailModal
                                    ext={ext}
                                    onClose={() => setShowModal(false)}
                                    shop={shop}
                                    scripts={scripts}
                                    apiBaseUrl={apiBaseUrl}
                                />
                            )}
                        </InlineStack>
                    </div>
                </BlockStack>

            </div>

        </Card>
    );
}