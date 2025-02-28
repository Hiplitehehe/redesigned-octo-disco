export default {
    async fetch(request) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const url = new URL(request.url);
        if (url.pathname === "/login") {
            return handleLogin(request);
        } else {
            return new Response("Not found", { status: 404 });
        }
    },
};

async function handleLogin(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return new Response("Missing fields", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
        }

        const githubToken = "YOUR_GITHUB_TOKEN";
        const repo = "YOUR_USERNAME/YOUR_REPO";
        const filePath = "K.json";

        const githubApiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
        const headers = {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Cloudflare-Worker/1.0"
        };

        let response = await fetch(githubApiUrl, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            return new Response("GitHub Fetch Error: " + errorText, { 
                status: response.status, 
                headers: { "Access-Control-Allow-Origin": "*" } 
            });
        }

        let data = await response.json();
        let content = JSON.parse(atob(data.content)); // Decode Base64

        if (!content[email] || content[email].password !== password) {
            return new Response("Invalid email or password", { status: 401, headers: { "Access-Control-Allow-Origin": "*" } });
        }

        return new Response("Login successful", {
            status: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
        });

    } catch (error) {
        return new Response("Server error: " + error.message, { 
            status: 500, 
            headers: { "Access-Control-Allow-Origin": "*" } 
        });
    }
    }
