// utils/buildEmailHTML.js
exports.buildEmailHTML = (blocks = [], title = "") => {
  if (!Array.isArray(blocks)) return "";

  const html = blocks
    .map((block) => {
      switch (block.type) {
        case "text":
          return `<p style="font-size:16px;color:#333;">${
            block.content || ""
          }</p>`;
        case "image":
          return block.url
            ? `<img src="${block.url}" alt="" style="max-width:100%;border-radius:8px;margin:10px 0;" />`
            : "";
        case "button":
          return `<a href="${
            block.link || "#"
          }" style="background:#007bff;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;margin:10px 0;">${
            block.text || "Click Here"
          }</a>`;
        default:
          return "";
      }
    })
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#222;">
      ${title ? `<h2>${title}</h2>` : ""}
      ${html}
    </div>
  `;
};
