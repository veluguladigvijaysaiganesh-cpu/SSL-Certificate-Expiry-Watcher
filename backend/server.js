require("dotenv").config();

const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 4000;

let domains = [];

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, {});
  }

  const parsed = url.parse(req.url, true);

  if (req.method === "GET" && parsed.pathname === "/api/health") {
    return sendJson(res, 200, {
      status: "ok"
    });
  }

  if (req.method === "GET" && parsed.pathname === "/api/domains") {
    return sendJson(res, 200, {
      domains
    });
  }

  if (req.method === "POST" && parsed.pathname === "/api/domains") {

    const body = await readBody(req);

    const index = domains.findIndex(
      d => d.id === body.id
    );

    if (index >= 0) {
      domains[index] = body;
    } else {
      domains.push(body);
    }

    return sendJson(res, 200, {
      domain: body
    });
  }

  if (
    req.method === "DELETE" &&
    parsed.pathname.startsWith("/api/domains/")
  ) {

    const id = Number(
      parsed.pathname.split("/").pop()
    );

    domains = domains.filter(
      d => d.id !== id
    );

    return sendJson(res, 200, {
      success: true
    });
  }

  if (
    req.method === "POST" &&
    parsed.pathname === "/api/check-ssl"
  ) {

    const body = await readBody(req);

    const domain = body.domain;

    return sendJson(res, 200, {
      url: domain,
      org: domain,
      issuer: "Let's Encrypt",
      status: "valid",
      daysLeft: 90,
      validFrom: "2026-01-01",
      validTo: "2026-04-01",
      grade: "A+",
      keyBits: 2048,
      keyType: "rsa",
      protocol: "TLSv1.3",
      country: "US",
      risk: "low",
      checked: "Just now"
    });
  }

  if (
    req.method === "POST" &&
    parsed.pathname === "/api/chat"
  ) {

    const body = await readBody(req);

    return sendJson(res, 200, {
      reply:
        "SSLWatch AI is running. Message received: " +
        body.message
    });
  }

  sendJson(res, 404, {
    error: "Not Found"
  });
});

server.listen(PORT, () => {
  console.log(
    `SSLWatch backend running on port ${PORT}`
  );
});
