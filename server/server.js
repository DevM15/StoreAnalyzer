import express from "express";
import cors from "cors";
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { PrismaClient } from '@prisma/client';
import axios from "axios";

// Initialize Prisma Client
const prisma = new PrismaClient();

async function saveLLMResponse(landing, popup, id) {
    try {
        const result = await prisma.lLMResponse.create({
            data: {
                landing: landing,
                popup: popup,
                id: id
            },
        });
    } catch (error) {
        console.error('Error saving LLM response:', error);
    } finally {
        await prisma.$disconnect();
    }
}

async function findLLMResponseById(id) {
    try {
        const response = await prisma.lLMResponse.findUnique({
            where: {
                id: id, // or just `id,` in shorthand
            },
        });

        if (!response) {
            console.log('No response found for ID:', id);
            return null;
        }
        return response;
    } catch (error) {
        console.error('Error fetching response:', error);
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

async function savePagePath(shopName, path) {
    try {
        console.log('Saving page path:', path, 'for shop:', shopName);
        const result = await prisma.pagePath.create({
            data: { shopName: shopName, path: path },
        });
        return result;
    } catch (error) {
        console.error('Error saving page path:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function getPagePath(shopName) {
    console.log('Fetching page path for shop:', shopName);
    try {
        const result = await prisma.pagePath.findUnique({
            where: { shopName: shopName },
        });
        return result;
    } catch (error) {
        console.error('Error fetching page path:', error);
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

async function saveShopSession(shop, accessToken, scope) {
    try {
        console.log('Saving shop session for:', shop);

        // Check if the connection is working
        await prisma.$connect();

        const result = await prisma.shopSession.upsert({
            where: { shop },
            update: {
                accessToken,
                scope,
                updatedAt: new Date()
            },
            create: {
                shop,
                accessToken,
                scope
            },
        });

        return result;
    } catch (error) {
        console.error('Error saving shop session:', error);

        // If it's a table doesn't exist error, provide helpful message
        if (error.message.includes('Table') && error.message.includes('doesn\'t exist')) {
            console.error('💡 Database table missing. Please run: npx prisma migrate dev');
        }

        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function getShopSession(shop) {
    try {
        console.log('Fetching shop session for:', shop);

        // Check if the connection is working
        await prisma.$connect();

        const result = await prisma.shopSession.findUnique({
            where: { shop },
        });

        return result;
    } catch (error) {
        console.error('Error fetching shop session:', error);

        // If it's a table doesn't exist error, provide helpful message
        if (error.message.includes('Table') && error.message.includes('doesn\'t exist')) {
            console.error('💡 Database table missing. Please run: npx prisma migrate dev');
        }

        return null;
    } finally {
        await prisma.$disconnect();
    }
}

async function incrementToolInstallation(toolName) {
    if (!toolName) {
        console.error('Tool name is required for installation increment');
        return null;
    }

    try {

        const result = await prisma.toolInstallation.upsert({
            where: { toolName },
            update: {
                metrics: { increment: 1 }
            },
            create: {
                toolName,
                metrics: 1
            }
        });

        return result;
    } catch (error) {
        console.error('Error incrementing tool installation:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function manageBookmarks(shopName, action, title = null) {
    try {
        console.log(`Managing bookmarks for shop: ${shopName}, action: ${action}, title: ${title}`);

        // Get or create bookmark record for the shop
        let bookmark = await prisma.bookmark.findUnique({
            where: { shopName }
        });

        if (!bookmark) {
            bookmark = await prisma.bookmark.create({
                data: {
                    shopName,
                    titles: JSON.stringify([])
                }
            });
        }

        let titles = JSON.parse(bookmark.titles || '[]');

        switch (action) {
            case 'add':
                if (title && !titles.includes(title)) {
                    titles.push(title);
                }
                break;
            case 'remove':
                if (title) {
                    titles = titles.filter(t => t !== title);
                }
                break;
            case 'get':
                // Just return current titles
                break;
            case 'clear':
                titles = [];
                break;
            default:
                throw new Error('Invalid action');
        }

        // Update the bookmark with new titles
        const updatedBookmark = await prisma.bookmark.update({
            where: { shopName },
            data: { titles: JSON.stringify(titles) }
        });

        return { titles, count: titles.length };
    } catch (error) {
        console.error('Error managing bookmarks:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function getToolsByInstallationCount() {
    const tools = await prisma.toolInstallation.findMany({
        orderBy: {
            metrics: 'desc',
        },
        select: {
            toolName: true,
            metrics: true,
        },
    })

    return tools
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Shopify API
export const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: [
        'read_products',
        'write_products',
        'read_themes',
        'write_themes',
        'write_online_store_pages',
        'read_script_tags',
        'write_script_tags',
        'write_content'
    ],
    hostName: process.env.SHOPIFY_APP_URL,
    apiVersion: LATEST_API_VERSION,
});

// Environment variables for OAuth
const {
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    SHOPIFY_SCOPES,
    SHOPIFY_REDIRECT_URI
} = process.env;

const geminiApiKey = process.env.GEMINI_API_KEY;

async function fetchAIData(prompt) {
    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB12ODGAP2-iia9jrcA5KBARj3IZlnbHMg`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{
                            text: `${prompt}`,
                        }],
                    },
                ],
            }),
        }
    );
    if (!geminiRes.ok) throw new Error("Gemini API error");
    const geminiData = await geminiRes.json();
    const geminiResponse =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";
    return geminiResponse;
}

app.get("/", (req, res) => {
    res.send("Hello from Shopify backend!");
});

// OAuth Step 1: Redirect to Shopify for authorization
app.get('/auth', (req, res) => {
    const shopParam = req.query.shop;

    if (!shopParam) {
        return res.status(400).send('Missing shop parameter! Usage: /auth?shop=your-shop.myshopify.com');
    }

    // Validate shop domain
    if (!shopParam.includes('.myshopify.com')) {
        return res.status(400).send('Invalid shop domain. Must be a .myshopify.com domain');
    }

    console.log('🔍 Environment check:');
    console.log('- SHOPIFY_API_KEY:', SHOPIFY_API_KEY ? 'Set' : 'Missing');
    console.log('- SHOPIFY_API_SECRET:', SHOPIFY_API_SECRET ? 'Set' : 'Missing');
    console.log('- SHOPIFY_REDIRECT_URI:', SHOPIFY_REDIRECT_URI || 'Using dynamic');
    console.log('- Request protocol:', req.protocol);
    console.log('- Request host:', req.get('host'));

    // Generate a simple state parameter
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const scopes = SHOPIFY_SCOPES || 'read_products,write_products,read_themes,write_themes,write_online_store_pages,read_script_tags,write_script_tags,write_content';
    const redirectUri = SHOPIFY_REDIRECT_URI;

    const authUrl = `https://${shopParam}/admin/oauth/authorize` +
        `?client_id=${SHOPIFY_API_KEY}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

    console.log('🔗 OAuth Configuration:');
    console.log('- Shop:', shopParam);
    console.log('- Scopes:', scopes);
    console.log('- Redirect URI:', redirectUri);
    console.log('- Auth URL:', authUrl);
    console.log('- State:', state);
    console.log('Redirecting to Shopify OAuth:', authUrl);
    res.redirect(authUrl);
});

// OAuth Step 2: Handle callback and exchange code for access token
app.get('/auth/callback', async (req, res) => {
    console.log('🎯 CALLBACK REACHED! Processing OAuth callback...');
    console.log('Full request URL:', req.originalUrl);
    console.log('Query parameters:', req.query);
    console.log('Headers:', {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-proto': req.headers['x-forwarded-proto']
    });

    const { shop: shopParam, code, state, error } = req.query;

    if (error) {
        console.error('❌ OAuth error from Shopify:', error);
        return res.status(400).send(`OAuth error: ${error}`);
    }

    if (!shopParam || !code) {
        console.error('❌ Missing required parameters:', { shopParam, code });
        return res.status(400).send('Missing required parameters (shop or code)');
    }

    // Validate shop domain
    if (!shopParam.includes('.myshopify.com')) {
        return res.status(400).send('Invalid shop domain');
    }

    console.log('Processing OAuth callback for shop:', shopParam);

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch(`https://${shopParam}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: SHOPIFY_API_KEY,
                client_secret: SHOPIFY_API_SECRET,
                code
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        const newAccessToken = tokenData.access_token;
        const scope = tokenData.scope;

        if (!newAccessToken) {
            throw new Error('No access token received from Shopify');
        }

        // Save the shop session to database
        await saveShopSession(shopParam, newAccessToken, scope);

        console.log(`✅ Successfully authenticated shop: ${shopParam}`);
        console.log(`🔑 Access token saved (${newAccessToken.substring(0, 10)}...)`);
        console.log(`📝 Scopes granted: ${scope}`);

        // Redirect to your Shopify app frontend with success message
        const appUrl = `${process.env.SHOPIFY_APP_URL}/?shop=${shopParam}&authenticated=true&message=Successfully connected to ${shopParam}`;
        console.log('🔗 Redirecting to app:', appUrl);
        res.redirect(appUrl);

    } catch (error) {
        console.error('❌ OAuth callback error:', error);
        res.status(500).send(`Authentication failed: ${error.message}`);
    }
});

app.get("/get-store-url", async (req, res) => {
    const shopParam = req.query.shop; // fallback to default

    try {
        // Get shop session from database
        const shopSession = await getShopSession(shopParam);

        if (!shopSession) {
            return res.status(401).json({
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopParam}`,
                message: 'Please authenticate your store first'
            });
        }

        const getPath = await getPagePath(shopParam);
        const path = getPath ? getPath.path : null;

        let storeUrl;
        if (path) {
            storeUrl = `https://${shopParam}/pages/${path}`;
        } else {
            storeUrl = `https://${shopParam}`;
        }

        res.json({
            storeUrl,
            shop: shopParam,
            hasPath: !!path,
            authenticated: true
        });
    } catch (error) {
        console.error('Error in get-store-url:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post("/ai-tools", async (req, res) => {
    const prompt = req.query.prompt;
    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{
                            text: `${prompt}`,
                        }],
                    },
                ],
            }),
        }
    );

    if (!geminiRes.ok) throw new Error("Gemini API error");
    const geminiData = await geminiRes.json();
    const geminiResponse =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";
    return geminiResponse;
});

app.get('/get-scripts', async (req, res) => {
    const shopParam = req.query.shop; // fallback to default

    try {
        // Get shop session from database
        const shopSession = await getShopSession(shopParam);

        if (!shopSession) {
            return res.status(401).json({
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopParam}`
            });
        }

        const dynamicSession = {
            shop: shopParam,
            accessToken: shopSession.accessToken
        };

        const client = new shopify.clients.Graphql({ session: dynamicSession });

        const query = `
        {
            scriptTags(first: 10) {
                edges {
                    node {
                        id
                        src
                    }
                }
            }
        }
        `;

        const response = await client.query({ data: query });
        const scriptTags = response.body.data.scriptTags.edges.map(edge => edge.node);
        console.log('Fetched script tags:', scriptTags);
        res.json(scriptTags);

    } catch (error) {
        console.error('Error in get-scripts:', error);
        res.status(500).json({
            error: 'Failed to fetch scripts',
            message: error.message
        });
    }
});

app.post("/addToolScript", async (req, res) => {
    const { name, shop: requestShop } = req.body;
    console.log('🔧 DEBUG: Received addToolScript request');
    console.log('- Request body:', req.body);
    console.log('- Name:', name);
    console.log('- Shop from request:', requestShop);

    const shopParam = requestShop;

    if (!shopParam) {
        console.error('❌ Shop parameter is missing or undefined');
        return res.status(400).json({
            error: 'Shop parameter is required',
            message: 'Please provide a valid shop name'
        });
    }

    console.log('Received request to add tool script for shop:', shopParam, 'with name:', name);

    try {
        // Get shop session from database
        const shopSession = await getShopSession(shopParam);

        if (!shopSession) {
            return res.status(401).json({
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopParam}`,
                message: 'Please authenticate your store first'
            });
        }

        const getTheme = await axios.get(
            `https://${shopParam}/admin/api/2024-04/themes.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': shopSession.accessToken,
                    'Content-Type': 'application/json'
                }
            }
        );
        const themes = getTheme.data.themes;
        const mainTheme = themes.find(theme => theme.role === 'main');

        const getThemeAssets = await axios.get(
            `https://${shopParam}/admin/api/2024-04/themes/${mainTheme.id}/assets.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': shopSession.accessToken,
                    'Content-Type': 'application/json',
                },
                params: {
                    'asset[key]': 'config/settings_data.json'
                }
            }
        );

        const settingsData = JSON.parse(getThemeAssets.data.asset.value);

        // 🟡 Example: extract some common color settings
        const themeSettings = settingsData.current || {};
        const colors = themeSettings.color_schemes['scheme-1'].settings;

        const id = Math.random().toString(36).substring(2, 15);
        const getPath = await getPagePath(shopParam);
        const path = getPath ? getPath.path : 'default';

        const promptPop = `Create a popup about ${name} tool which contains a button that redirects to /pages/${path}. Design a modern, playful pop-up advertisement UI for the tool.Use bold, quirky fonts, generous padding, and rounded corners. The layout should feel vibrant and humorous, encouraging clicks through cheeky phrasing. Incorporate soft gradients or pastel background elements for visual charm, and place the pop-up over a blurred website backdrop to emphasize focus. Background must be gradient. The popup should have a close button to close the popup - Use inline onclick JavaScript (no external scripts or frameworks).The popup div should not have display none before closing.The response should conatin only the code for the popup in a single HTML tag . No explanations or extra output.No images`;
        const promptTool = `Create a ${name} tool.Do not apply any styles to the <body> tag.Generate a responsive form layout with CSS variables for colors and modern UI styling.
❗️Do not include any styles for the body tag — keep all styles scoped to classes only. Style the input field with a minimalist aesthetic, rounded corners, subtle shadows, and soft gradients. Use playful, readable fonts and a light color palette with pastel accents. Make the design responsive and visually balanced, ideal for a modern web app interface. The background should use full width of the screen. The tool should be attractive, stylish, engaging, colorful, and user-friendly. Do not apply any styles to the <body> element. No image and do not use domcontentloaded. Keep the eventlistner in the script tag. The response should contain only the code for the tool in a respective tag. No explanations or extra output or meta tags.Use consistent padding, playful transitions, and rounded corners throughout.use this colors : ${colors}.`;

        const popUP = await fetchAIData(promptPop);
        // const popUP = ''
        const landing = await fetchAIData(promptTool);

        await saveLLMResponse(landing, popUP, id);

        const url = `https://${shopParam}/admin/api/2024-04/script_tags.json`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': shopSession.accessToken, // Use dynamic access token
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                script_tag: {
                    event: 'onload',
                    src: `https://celebrated-cobbler-c97fe5.netlify.app/ai-tools.js?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&path=${encodeURIComponent(path)}`,
                }
            })
        });

        const shopUrl = `https://${shopParam}/pages/${path}`;
        if (response.ok) {
            console.log('Script tag added successfully for shop:', shopParam);
            res.status(200).json({
                message: 'Script tag added successfully',
                shopUrl: shopUrl,
                shop: shopParam
            });
        } else {
            const errorText = await response.text();
            console.error('Failed to add script tag:', response.status, errorText);
            res.status(response.status).json({
                error: 'Failed to add script tag',
                details: errorText
            });
        }
    } catch (error) {
        console.error('Error in addToolScript:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get("/llmResponse", async (req, res) => {
    const { id, name, LandingPage } = req.query;
    try {
        if (LandingPage === 'true') {
            console.log("Fetching landing page response for id:", id);
            await incrementToolInstallation(name);
        }
        const response = await findLLMResponseById(id);
        if (response) {
            res.json(response);
        } else {
            res.status(404).json({ error: 'Response not found' });
        }
    } catch (error) {
        console.error('Error fetching LLM response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post("/removeToolScript", async (req, res) => {
    const { deleteScriptId, shop: requestShop } = req.body;
    const shopParam = requestShop; // fallback to default

    try {
        // Get shop session from database
        const shopSession = await getShopSession(shopParam);

        if (!shopSession) {
            return res.status(401).json({
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopParam}`
            });
        }

        const url = `https://${shopParam}/admin/api/2024-04/script_tags/${deleteScriptId}.json`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-Shopify-Access-Token': shopSession.accessToken, // Use dynamic access token
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('Script tag removed successfully for shop:', shopParam);
            res.json({ success: true });
        } else {
            const errorText = await response.text();
            console.error('Failed to remove script tag:', response.status, errorText);
            res.status(response.status).json({
                success: false,
                error: errorText
            });
        }
    } catch (error) {
        console.error('Error in removeToolScript:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get page path for the current shop
app.get("/get-page-path", async (req, res) => {
    const shopParam = req.query.shop; // fallback to default

    try {
        const result = await getPagePath(shopParam);
        if (result) {
            res.json({ path: result.path, shopName: result.shopName });
        } else {
            res.json({ path: null, shopName: shopParam });
        }
    } catch (error) {
        console.error('Error fetching page path:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Save page path for the shop
app.post("/save-page-path", async (req, res) => {
    const { path, shopName } = req.body;

    if (!path || !shopName) {
        return res.status(400).json({
            success: false,
            error: 'Path and shop name are required'
        });
    }

    try {
        // Get shop session to verify authentication
        const shopSession = await getShopSession(shopName);

        if (!shopSession) {
            return res.status(401).json({
                success: false,
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopName}`
            });
        }

        const result = await savePagePath(shopName, path);

        const dynamicSession = {
            shop: shopName,
            accessToken: shopSession.accessToken
        };

        const client = new shopify.clients.Graphql({ session: dynamicSession });

        const PAGE_CREATE_MUTATION = `
        mutation CreatePage($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page {
              id
              title
              handle
            }
            userErrors {
              code
              field
              message
            }
          }
        }
        `;

        const variables = {
            page: {
                title: `${path} Page`,
                handle: `${path}`,
                body: '',
                isPublished: true,
                templateSuffix: 'custom',
            },
        };

        const resp = await client.query({ data: { query: PAGE_CREATE_MUTATION, variables } });
        const pageResult = resp.body.data.pageCreate;

        if (pageResult.userErrors.length > 0) {
            console.error('Error creating page:', pageResult.userErrors);
            return res.status(400).json({
                success: false,
                error: pageResult.userErrors[0].message
            });
        }

        res.json({
            success: true,
            data: pageResult,
            message: 'Page path saved successfully'
        });
    } catch (error) {
        console.error('Error saving page path:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save page path'
        });
    }
});

app.get("/analytics", async (req, res) => {
    try {
        const tools = await getToolsByInstallationCount();
        res.json(tools);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get products from the shop
app.get('/get-products', async (req, res) => {
    const shopParam = req.query.shop;

    if (!shopParam) {
        return res.status(400).json({
            error: 'Shop parameter is required'
        });
    }

    try {
        // Get shop session from database
        const shopSession = await getShopSession(shopParam);

        if (!shopSession) {
            return res.status(401).json({
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopParam}`
            });
        }

        const dynamicSession = {
            shop: shopParam,
            accessToken: shopSession.accessToken
        };

        const client = new shopify.clients.Graphql({ session: dynamicSession });

        const query = `
        {
            products(first: 10) {
                edges {
                    node {
                        id
                        title
                        handle
                        description
                        productType
                        vendor
                        tags
                        status
                        createdAt
                        updatedAt
                        images(first: 1) {
                            edges {
                                node {
                                    id
                                    url
                                    altText
                                }
                            }
                        }
                        variants(first: 1) {
                            edges {
                                node {
                                    id
                                    title
                                    price
                                    compareAtPrice
                                    sku
                                    inventoryQuantity
                                }
                            }
                        }
                    }
                }
            }
        }
        `;

        const response = await client.query({ data: query });
        const products = response.body.data.products.edges.map(edge => ({
            id: edge.node.id,
            title: edge.node.title,
            handle: edge.node.handle,
            description: edge.node.description,
            productType: edge.node.productType,
            vendor: edge.node.vendor,
            tags: edge.node.tags,
            status: edge.node.status,
            createdAt: edge.node.createdAt,
            updatedAt: edge.node.updatedAt,
            image: edge.node.images.edges[0]?.node || null,
            variant: edge.node.variants.edges[0]?.node || null
        }));

        console.log(`Fetched ${products.length} products for shop: ${shopParam}`);
        res.json({
            products,
            count: products.length,
            shop: shopParam
        });

    } catch (error) {
        console.error('Error in get-products:', error);
        res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message
        });
    }
});

// Bookmark management endpoint
app.post("/manage-bookmarks", async (req, res) => {
    const { shopName, action, title } = req.body;

    if (!shopName || !action) {
        return res.status(400).json({
            success: false,
            error: 'Shop name and action are required'
        });
    }

    if ((action === 'add' || action === 'remove') && !title) {
        return res.status(400).json({
            success: false,
            error: 'Title is required for add/remove actions'
        });
    }

    try {
        // Verify shop authentication
        const shopSession = await getShopSession(shopName);
        if (!shopSession) {
            return res.status(401).json({
                success: false,
                error: 'Shop not authenticated',
                redirectToAuth: `/auth?shop=${shopName}`
            });
        }

        const result = await manageBookmarks(shopName, action, title);

        res.json({
            success: true,
            data: result,
            message: `Bookmark ${action} successful`
        });
    } catch (error) {
        console.error('Error managing bookmarks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to manage bookmarks'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});