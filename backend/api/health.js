export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "nike-store-agent-backend",
    version: "2.0.0"
  });
}
