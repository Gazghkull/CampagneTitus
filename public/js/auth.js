// Gestion des droits sur les boutons admin
fetch("/api/me")
  .then(r => r.json())
  .then(user => {
    const roleFromSession = sessionStorage.getItem("role");
    const role = user.role || roleFromSession || "user";

    if (role !== "admin") {
      document.querySelectorAll(".admin-only")
        .forEach(e => e.style.display = "none");
    }
  })
  .catch(() => {
    // En cas d'erreur fetch, on cache les boutons admin
    document.querySelectorAll(".admin-only")
      .forEach(e => e.style.display = "none");
  });