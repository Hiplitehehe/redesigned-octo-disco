export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ALLOWED_USERS = ["Hiplitehehe"];
    const repo = "hiplitehehe/notes";
    const notesFile = "j.json";
    const notesUrl = `https://api.github.com/repos/${repo}/contents/${notesFile}`;

    // 🔹 GitHub Login Redirect
    if (url.pathname === "/login") {
      return Response.redirect(
        `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${env.REDIRECT_URI}&scope=repo`,
        302
      );
    }

    // 🔹 GitHub OAuth Callback
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.REDIRECT_URI
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        return new Response(`Error: ${JSON.stringify(tokenData)}`, { status: 400 });
      }

      return Response.redirect(
        `https://hiplitehehe.github.io/bookish-octo-robot/index.html?token=${tokenData.access_token}`,
        302
      );
    }

    // 🔹 Make a New Note
    if (url.pathname === "/make") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const token = authHeader.split(" ")[1];

      // Verify GitHub user
      const userResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "HipliteBot/1.0" }
      });

      const userData = await userResponse.json();
      if (!userData.login) return new Response("Invalid token", { status: 401 });

      // Get note title & content
      const body = await request.json();
      if (!body.title || !body.content) return new Response("Missing note title/content", { status: 400 });

      // Fetch current notes
      let notes = [];
      const fetchNotes = await fetch(notesUrl, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json" },
      });

      let sha = null;
      if (fetchNotes.ok) {
        const fileData = await fetchNotes.json();
        notes = JSON.parse(atob(fileData.content));
        sha = fileData.sha; // Get file SHA for updating
      }

      // Add new note
      notes.push({ title: body.title, content: body.content, approved: false });

      // Update GitHub
      const updateResponse = await fetch(notesUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Added note: ${body.title}`,
          content: btoa(JSON.stringify(notes, null, 2)),
          sha: sha || undefined, // Only include SHA if file exists
        }),
      });

      if (!updateResponse.ok) {
        return new Response("Failed to create note", { status: 500 });
      }

      return new Response(JSON.stringify({ message: `Note "${body.title}" created!` }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 🔹 Approve a Note (Only Allowed Users)
    if (url.pathname === "/approve") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const token = authHeader.split(" ")[1];

      // Verify GitHub user
      const userResponse = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "HipliteBot/1.0" }
      });

      const userData = await userResponse.json();
      if (!userData.login) return new Response("Invalid token", { status: 401 });

      if (!ALLOWED_USERS.includes(userData.login)) {
        return new Response("Permission denied: You cannot approve notes.", { status: 403 });
      }

      // Get note title
      const body = await request.json();
      if (!body.title) return new Response("Missing note title", { status: 400 });

      // Fetch current notes
      let notes = [];
      const fetchNotes = await fetch(notesUrl, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json" },
      });

      let sha = null;
      if (fetchNotes.ok) {
        const fileData = await fetchNotes.json();
        notes = JSON.parse(atob(fileData.content));
        sha = fileData.sha;
      }

      // Approve note
      const note = notes.find(n => n.title === body.title);
      if (note) note.approved = true;

      // Update GitHub
      const updateResponse = await fetch(notesUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Approved note: ${body.title}`,
          content: btoa(JSON.stringify(notes, null, 2)),
          sha: sha || undefined,
        }),
      });

      if (!updateResponse.ok) {
        return new Response("Failed to approve note", { status: 500 });
      }

      return new Response(JSON.stringify({ message: `Note "${body.title}" approved!` }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 🔹 Get Only Approved Notes
    if (url.pathname === "/notes") {
      const fetchNotes = await fetch(notesUrl, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json" },
      });

      if (!fetchNotes.ok) return new Response("Failed to fetch notes", { status: 500 });

      const fileData = await fetchNotes.json();
      const notes = JSON.parse(atob(fileData.content));

      // Filter only approved notes
      const approvedNotes = notes.filter(note => note.approved);

      return new Response(JSON.stringify(approvedNotes), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" },
        status: 200,
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
