export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login") {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.REDIRECT_URI}`,
        302
      );
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"  // Ensure GitHub returns JSON
    },
    body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.REDIRECT_URI,
    }),
});

      async function handleCallback(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
        return new Response("Error: Missing GitHub code", { status: 400 });
    }

    try {
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const data = await tokenResponse.json();

        if (!data.access_token) {
            return new Response(`Error: ${JSON.stringify(data)}`, { status: 400 });
        }

        // Redirect back to the frontend with the token
        return new Response(null, {
            status: 302,
            headers: {
                "Location": `https://hiplitehehe.github.io/bookish-octo-robot/index.html?token=${data.access_token}`
            }
        });

    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}
      
const tokenText = await tokenResponse.text();  // Get raw response
return new Response(`<pre>${tokenText}</pre>`, {
    headers: { "Content-Type": "text/html" }
});

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        return new Response("Failed to get access token", { status: 500 });
      }

      // Fetch user details from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();
      if (!userData.login) {
        return new Response("Failed to get user data", { status: 500 });
      }

      // Redirect back to frontend with user info
      return Response.redirect(
        `https://hiplitehehe.github.io/bookish-octo-robot/index.html?username=${encodeURIComponent(userData.login)}`,
        302
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
