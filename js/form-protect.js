document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reservation-form") || document.getElementById("contact-form");
  const popup = document.getElementById("popup");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = new FormData(form);
    const nom = (data.get("nom") || "").trim();
    const email = (data.get("email") || "").trim();
    const message = (data.get("message") || "").trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!nom || !emailRegex.test(email)) {
      alert("Merci de vérifier vos informations.");
      return;
    }
    const forbidden = /(bcc:|cc:|content-type:|<script|<\/script>|http:\/\/|https:\/\/)/i;
    if (forbidden.test(nom) || forbidden.test(message)) {
      alert("Caractères interdits détectés.");
      return;
    }
    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: data,
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        form.reset();
        popup.classList.remove("hidden");
      } else {
        alert("Erreur lors de l'envoi.");
      }
    } catch (error) {
      alert("Erreur réseau. Vérifiez votre connexion.");
    }
  });
});
function closePopup() {
  const popup = document.getElementById("popup");
  popup.classList.add("hidden");
}