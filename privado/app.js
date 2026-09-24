const API = "/privado/api";

const gallery =
  document.getElementById("gallery");

const searchInput =
  document.getElementById("search");

const createModal =
  document.getElementById("createModal");

const createForm =
  document.getElementById("createForm");

const message =
  document.getElementById("message");

let currentCategory = "Todas";
let favoritesOnly = false;
let categoryList = [];


/* API */

async function api(path, options = {}) {

  const response = await fetch(
    API + path,
    {
      credentials: "same-origin",
      ...options
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Respuesta inválida del servidor."
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error || "Error del servidor."
    );
  }

  return data;
}


/* CARGAR ÁLBUMES */

async function loadAlbums() {

  message.textContent = "";
  message.className = "message";

  updateFavoritesModeUI();

  if (favoritesOnly) {
    await loadFavoritesView();
    return;
  }

  gallery.innerHTML =
    '<div class="loading">Cargando...</div>';

  const params =
    new URLSearchParams();

  const search =
    searchInput.value.trim();

  if (search) {
    params.set("search", search);
  }

  if (currentCategory !== "Todas") {
    params.set(
      "category",
      currentCategory
    );
  }

  try {

    const data = await api(
      "/albums?" + params.toString()
    );

    renderAlbums(data.albums || []);

  } catch (error) {

    gallery.innerHTML = "";

    message.className =
      "message error";

    message.textContent =
      error.message;
  }
}


/* MOSTRAR ÁLBUMES */

function renderAlbums(albums) {

  gallery.innerHTML = "";

  if (!albums.length) {

    gallery.innerHTML = `
      <div class="empty">
        <strong>No hay álbumes todavía</strong>
        Crea tu primer álbum para comenzar.
      </div>
    `;

    return;
  }

  for (const album of albums) {

    const card =
      document.createElement("article");

    card.className = "album";

    let cover;

    if (album.cover_key) {

      const imageURL =
        `${API}/images/${
          encodeURIComponent(album.cover_key)
        }`;

      cover = `
        <div class="cover">
          <img
            src="${imageURL}"
            alt=""
            loading="lazy"
          >
        </div>
      `;

    } else {

      cover = `
        <div class="cover">
          BP
        </div>
      `;
    }

    card.innerHTML = `
      ${cover}

      ${Number(album.favorite) === 1
        ? '<div class="album-favorite-badge">♥</div>'
        : ''
      }

      <div class="album-info">

        <p class="album-name"></p>

        <p class="album-count">
          ${album.photo_count || 0}
          foto${
            Number(album.photo_count) === 1
              ? ""
              : "s"
          }
        </p>

        <p class="album-category-label"></p>

      </div>
    `;

    card.querySelector(
      ".album-name"
    ).textContent = album.name;

    card.querySelector(
      ".album-category-label"
    ).textContent =
      album.category || "Sin categoría";

    card.addEventListener(
      "click",
      () => openAlbum(album.id)
    );

    gallery.appendChild(card);
  }
}


/* CREAR ÁLBUM */

document
  .getElementById("createButton")
  .addEventListener("click", () => {

    createModal.classList.add("show");

    setTimeout(() => {
      document
        .getElementById("albumName")
        .focus();
    }, 100);

  });


document
  .getElementById("cancelCreate")
  .addEventListener("click", () => {

    createModal.classList.remove("show");

  });


createModal.addEventListener(
  "click",
  event => {

    if (event.target === createModal) {
      createModal.classList.remove("show");
    }

  }
);


createForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const saveButton =
      document.getElementById("saveAlbum");

    const name =
      document
        .getElementById("albumName")
        .value
        .trim();

    const category =
      document
        .getElementById("albumCategory")
        .value;

    const description =
      document
        .getElementById(
          "createAlbumDescription"
        )
        .value
        .trim();

    if (!name) {
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Creando...";

    try {

      await api(
        "/albums",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name,
            category,
            description
          })
        }
      );

      createForm.reset();

      createModal.classList.remove(
        "show"
      );

      await loadAlbums();

    } catch (error) {

      alert(error.message);

    } finally {

      saveButton.disabled = false;
      saveButton.textContent = "Crear";

    }

  }
);

/* =========================================
   CATEGORÍAS DINÁMICAS
========================================= */

async function loadCategories() {

  try {

    const data =
      await api("/categories");

    categoryList =
      data.categories || [];

    renderCategories();
    renderCategorySelect();

  } catch (error) {

    console.error(
      "Error cargando categorías:",
      error
    );

  }
}


function renderCategories() {

  const container =
    document.getElementById("categories");

  container.innerHTML = "";


  // TODAS

  const allButton =
    document.createElement("button");

  allButton.type = "button";
  allButton.className =
    "category" +
    (
      currentCategory === "Todas"
        ? " active"
        : ""
    );

  allButton.textContent = "Todas";

  allButton.addEventListener(
    "click",
    () => {

      currentCategory = "Todas";

      renderCategories();
      loadAlbums();

    }
  );

  container.appendChild(allButton);


  // CATEGORÍAS DEL USUARIO

  for (const category of categoryList) {

  const item =
    document.createElement("div");

  item.className =
    "category-item";


  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "category" +
    (
      currentCategory === category.name
        ? " active"
        : ""
    );

  button.textContent =
    category.name;

  button.addEventListener(
    "click",
    () => {

      currentCategory =
        category.name;

      renderCategories();
      loadAlbums();

    }
  );


  item.appendChild(button);


/*
 * "Sin categoría" es una categoría
 * especial del sistema.
 * No permitimos editarla ni borrarla.
 */

if (!category.system) {

  const menuButton =
    document.createElement("button");

  menuButton.type = "button";

  menuButton.className =
    "category-menu-btn";

  menuButton.textContent = "⋮";

  menuButton.setAttribute(
    "aria-label",
    `Editar ${category.name}`
  );

  menuButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      openManageCategory(
        category
      );

    }
  );

  item.appendChild(menuButton);

}


container.appendChild(item);

}


  // NUEVA CATEGORÍA

  const newButton =
    document.createElement("button");

  newButton.type = "button";
  newButton.className =
    "category new-category";

  newButton.textContent =
    "+ Nueva categoría";

  newButton.addEventListener(
    "click",
    openCategoryModal
  );

  container.appendChild(newButton);
}


function renderCategorySelect() {

  const select =
    document.getElementById(
      "albumCategory"
    );

  select.innerHTML = `
    <option value="">
      Selecciona una categoría
    </option>
  `;

  for (const category of categoryList) {

    const option =
      document.createElement("option");

    option.value =
      category.name;

    option.textContent =
      category.name;

    select.appendChild(option);
  }
}


/* MODAL */

const categoryModal =
  document.getElementById(
    "categoryModal"
  );

const categoryForm =
  document.getElementById(
    "categoryForm"
  );


function openCategoryModal() {

  categoryModal.classList.add(
    "show"
  );

  setTimeout(() => {

    document
      .getElementById("categoryName")
      .focus();

  }, 100);
}


function closeCategoryModal() {

  categoryModal.classList.remove(
    "show"
  );

  categoryForm.reset();
}


document
  .getElementById("cancelCategory")
  .addEventListener(
    "click",
    closeCategoryModal
  );


categoryModal.addEventListener(
  "click",
  event => {

    if (event.target === categoryModal) {
      closeCategoryModal();
    }

  }
);


/* CREAR */

categoryForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const input =
      document.getElementById(
        "categoryName"
      );

    const button =
      document.getElementById(
        "saveCategory"
      );

    const name =
      input.value.trim();

    if (!name) {
      return;
    }

    button.disabled = true;
    button.textContent =
      "Creando...";

    try {

      await api(
        "/categories",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name
          })
        }
      );

      closeCategoryModal();

      await loadCategories();

    } catch (error) {

      alert(error.message);

    } finally {

      button.disabled = false;
      button.textContent = "Crear";

    }

  }
);

/* FAVORITOS */

function updateFavoritesModeUI() {

  const button =
    document.getElementById(
      "favoritesButton"
    );

  const categories =
    document.getElementById(
      "categories"
    );

  const favoritesView =
    document.getElementById(
      "favoritesView"
    );

  // "action" es la clase base del botón y debe conservarse
  // siempre. Solo cambiamos su estado visual.
  button.classList.add("action");

  if (favoritesOnly) {

    button.textContent = "← Galería";

    button.classList.remove(
      "light"
    );

    button.classList.add(
      "is-active"
    );

    gallery.style.display = "none";

    favoritesView.hidden = false;

    searchInput.style.display =
      "none";

    categories.style.display =
      "none";

  } else {

    button.textContent =
      "♥ Favoritos";

    button.classList.add(
      "light"
    );

    button.classList.remove(
      "is-active"
    );

    gallery.style.display = "";

    favoritesView.hidden = true;

    searchInput.style.display = "";

    categories.style.display = "";

  }
}


document
  .getElementById("favoritesButton")
  .addEventListener(
    "click",
    async () => {

      favoritesOnly =
        !favoritesOnly;

      await loadAlbums();

    }
  );


/* BÚSQUEDA */

let searchTimer;

searchInput.addEventListener(
  "input",
  () => {

    clearTimeout(searchTimer);

    searchTimer =
      setTimeout(loadAlbums, 300);

  }
);


/* ABRIR ÁLBUM */

let currentAlbumId = null;
let currentPhotos = [];
let currentPhotoIndex = 0;
let currentAlbum = null;

let photoSelectionMode = false;
const selectedPhotoIds = new Set();

async function openAlbum(
  id,
  addHistory = true
) {

  photoSelectionMode = false;
  selectedPhotoIds.clear();

  currentAlbumId = id;

  try {

    const data =
      await api(`/albums/${id}`);

    renderAlbumView(data);

    if (addHistory) {

      history.pushState(
        {
          view: "album",
          albumId: id
        },
        "",
        `#album-${id}`
      );

    }

  } catch (error) {

    alert(error.message);

  }
}
/* INICIAR */

async function init() {
  await loadCategories();
  await loadAlbums();
}


function renderDescriptionWithLinks(
  element,
  value
) {

  const text =
    String(value || "").trim();

  element.replaceChildren();

  if (!text) {

    element.textContent =
      "Sin descripción";

    return;

  }

  const urlRegex =
    /(?:https?:\/\/|www\.)[^\s<]+/gi;

  let lastIndex = 0;

  for (
    const match
    of text.matchAll(urlRegex)
  ) {

    const matchIndex =
      match.index ?? 0;

    const original =
      match[0];

    let visibleURL =
      original;

    let trailing = "";

    while (
      visibleURL.length &&
      /[.,!?;:)\]}]$/.test(
        visibleURL
      )
    ) {

      trailing =
        visibleURL.slice(-1) +
        trailing;

      visibleURL =
        visibleURL.slice(0, -1);

    }


    if (
      matchIndex >
      lastIndex
    ) {

      element.appendChild(
        document.createTextNode(
          text.slice(
            lastIndex,
            matchIndex
          )
        )
      );

    }


    if (visibleURL) {

      const link =
        document.createElement(
          "a"
        );

      link.className =
        "album-description-link";

      link.href =
        /^www\./i.test(
          visibleURL
        )
          ? `https://${visibleURL}`
          : visibleURL;

      link.textContent =
        visibleURL;

      link.target = "_blank";

      link.rel =
        "noopener noreferrer";

      element.appendChild(link);

    }


    if (trailing) {

      element.appendChild(
        document.createTextNode(
          trailing
        )
      );

    }


    lastIndex =
      matchIndex +
      original.length;

  }


  if (
    lastIndex <
    text.length
  ) {

    element.appendChild(
      document.createTextNode(
        text.slice(lastIndex)
      )
    );

  }

}


function renderAlbumView(data) {

  currentAlbum = data.album;
  currentPhotos = data.photos || [];

  const favoriteAlbumButton =
    document.getElementById(
      "favoriteAlbumButton"
    );

  favoriteAlbumButton.textContent =
    Number(currentAlbum.favorite) === 1
      ? "♥ Álbum favorito"
      : "♡ Álbum favorito";


  const albumView =
    document.getElementById(
      "albumView"
    );

  const albumTitle =
    document.getElementById(
      "albumTitle"
    );

  const albumCategoryBadge =
    document.getElementById(
      "albumCategoryBadge"
    );

  const albumDescription =
    document.getElementById(
      "albumDescription"
    );

  const albumInfo =
    document.getElementById(
      "albumInfo"
    );

  const albumPhotoCount =
    document.getElementById(
      "albumPhotoCount"
    );

  const albumCoverImage =
    document.getElementById(
      "albumCoverImage"
    );

  const albumCoverPlaceholder =
    document.getElementById(
      "albumCoverPlaceholder"
    );

  const grid =
    document.getElementById(
      "photoGrid"
    );


  albumTitle.textContent =
    currentAlbum.name || "Álbum";

  albumCategoryBadge.textContent =
    currentAlbum.category ||
    "Sin categoría";

  const description =
    String(
      currentAlbum.description || ""
    ).trim();

  renderDescriptionWithLinks(
    albumDescription,
    description
  );

  albumDescription.classList.toggle(
    "is-empty",
    !description
  );


  const photoTotal =
    currentPhotos.length;

  albumInfo.textContent =
    `${photoTotal} foto${
      photoTotal === 1 ? "" : "s"
    }`;

  albumPhotoCount.textContent =
    String(photoTotal);

  const selectPhotosButton =
    document.getElementById(
      "selectPhotosButton"
    );

  selectPhotosButton.disabled =
    photoTotal === 0;

  selectPhotosButton.textContent =
    photoSelectionMode
      ? "Cancelar"
      : "Seleccionar";

  selectPhotosButton.classList.toggle(
    "is-active",
    photoSelectionMode
  );


  if (currentAlbum.cover_key) {

    albumCoverImage.src =
      `${API}/images/${
        encodeURIComponent(
          currentAlbum.cover_key
        )
      }`;

    albumCoverImage.alt =
      `Portada de ${currentAlbum.name}`;

    albumCoverImage.hidden = false;

    albumCoverPlaceholder.hidden =
      true;

  } else {

    albumCoverImage.removeAttribute(
      "src"
    );

    albumCoverImage.hidden = true;

    albumCoverPlaceholder.hidden =
      false;

  }


  grid.innerHTML = "";


  if (!currentPhotos.length) {

    grid.innerHTML = `
      <div class="album-empty">
        <strong>
          Este álbum todavía está vacío
        </strong>
        Sube tus primeras fotografías con el botón +.
      </div>
    `;

  } else {

    for (
      let i = 0;
      i < currentPhotos.length;
      i++
    ) {

      const photo =
        currentPhotos[i];

      const item =
        document.createElement(
          "div"
        );

      item.className =
        "photo-item";

      item.dataset.photoId =
        String(photo.id);

      item.classList.toggle(
        "selection-enabled",
        photoSelectionMode
      );

      item.classList.toggle(
        "selected",
        selectedPhotoIds.has(
          Number(photo.id)
        )
      );


      const image =
        document.createElement(
          "img"
        );

      image.src =
        `${API}/images/${
          encodeURIComponent(
            photo.r2_key
          )
        }`;

      image.loading = "lazy";

      image.alt =
        photo.title ||
        photo.filename ||
        "Fotografía";

      item.appendChild(image);

      const selectionIndicator =
        document.createElement(
          "div"
        );

      selectionIndicator.className =
        "photo-select-indicator";

      selectionIndicator.textContent =
        "✓";

      item.appendChild(
        selectionIndicator
      );


      if (
        Number(photo.favorite) === 1
      ) {

        const heart =
          document.createElement(
            "div"
          );

        heart.className =
          "photo-favorite-badge";

        heart.textContent = "♥";

        item.appendChild(heart);

      }


      item.addEventListener(
        "click",
        () => {

          if (photoSelectionMode) {

            togglePhotoSelection(
              photo.id
            );

            return;
          }

          openPhotoViewer(i);

        }
      );

      grid.appendChild(item);

    }

  }


  updatePhotoSelectionUI();

  albumView.style.display =
    "block";

  albumView.scrollTo(
    0,
    0
  );
}


document
  .getElementById("backToAlbums")
  .addEventListener(
    "click",
    () => {

      if (photoSelectionMode) {
        exitPhotoSelectionMode();
        return;
      }

      if (
        history.state?.view === "album"
      ) {

        history.back();

      } else {

        closeAlbumView();

      }

    }
  );


function closeAlbumView() {

  stopSlideshow();

  photoSelectionMode = false;
  selectedPhotoIds.clear();

  document
    .getElementById("albumView")
    .style.display = "none";

  currentAlbumId = null;
  currentAlbum = null;
  currentPhotos = [];

  window.scrollTo(0, 0);
}
  
  
/* =========================================
   SELECCIÓN MÚLTIPLE DE FOTOS
========================================= */

function updatePhotoSelectionUI() {

  const albumView =
    document.getElementById(
      "albumView"
    );

  const bar =
    document.getElementById(
      "photoSelectionBar"
    );

  const count =
    document.getElementById(
      "photoSelectionCount"
    );

  const selectButton =
    document.getElementById(
      "selectPhotosButton"
    );

  const selectAllButton =
    document.getElementById(
      "selectAllPhotos"
    );

  const favoriteButton =
    document.getElementById(
      "favoriteSelectedPhotos"
    );

  const deleteButton =
    document.getElementById(
      "deleteSelectedPhotos"
    );


  albumView.classList.toggle(
    "selection-active",
    photoSelectionMode
  );

  bar.hidden =
    !photoSelectionMode;

  selectButton.classList.toggle(
    "is-active",
    photoSelectionMode
  );

  selectButton.textContent =
    photoSelectionMode
      ? "Cancelar"
      : "Seleccionar";


  const selectedCount =
    selectedPhotoIds.size;

  count.textContent =
    `${selectedCount} seleccionada${
      selectedCount === 1
        ? ""
        : "s"
    }`;


  const allSelected =
    currentPhotos.length > 0 &&
    selectedCount ===
      currentPhotos.length;

  selectAllButton.textContent =
    allSelected
      ? "Ninguna"
      : "Todas";


  favoriteButton.disabled =
    selectedCount === 0;

  deleteButton.disabled =
    selectedCount === 0;


  const selectedPhotos =
    currentPhotos.filter(
      photo =>
        selectedPhotoIds.has(
          Number(photo.id)
        )
    );

  const allFavorites =
    selectedPhotos.length > 0 &&
    selectedPhotos.every(
      photo =>
        Number(photo.favorite) === 1
    );

  favoriteButton.textContent =
    allFavorites
      ? "♡ Quitar favorito"
      : "♥ Favoritas";


  const items =
    document
      .getElementById(
        "photoGrid"
      )
      .querySelectorAll(
        ".photo-item"
      );

  items.forEach(
    item => {

      const photoId =
        Number(
          item.dataset.photoId
        );

      item.classList.toggle(
        "selection-enabled",
        photoSelectionMode
      );

      item.classList.toggle(
        "selected",
        photoSelectionMode &&
        selectedPhotoIds.has(
          photoId
        )
      );

    }
  );
}


function enterPhotoSelectionMode() {

  if (!currentPhotos.length) {
    return;
  }

  stopSlideshow();
  closePhotoViewer();

  photoSelectionMode = true;
  selectedPhotoIds.clear();

  updatePhotoSelectionUI();
}


function exitPhotoSelectionMode() {

  photoSelectionMode = false;
  selectedPhotoIds.clear();

  updatePhotoSelectionUI();
}


function togglePhotoSelection(
  photoId
) {

  const id =
    Number(photoId);

  if (selectedPhotoIds.has(id)) {
    selectedPhotoIds.delete(id);
  } else {
    selectedPhotoIds.add(id);
  }

  updatePhotoSelectionUI();
}


document
  .getElementById(
    "selectPhotosButton"
  )
  .addEventListener(
    "click",
    () => {

      if (photoSelectionMode) {
        exitPhotoSelectionMode();
      } else {
        enterPhotoSelectionMode();
      }

    }
  );


document
  .getElementById(
    "cancelPhotoSelection"
  )
  .addEventListener(
    "click",
    exitPhotoSelectionMode
  );


document
  .getElementById(
    "selectAllPhotos"
  )
  .addEventListener(
    "click",
    () => {

      const allSelected =
        currentPhotos.length > 0 &&
        selectedPhotoIds.size ===
          currentPhotos.length;

      selectedPhotoIds.clear();

      if (!allSelected) {

        for (
          const photo
          of currentPhotos
        ) {

          selectedPhotoIds.add(
            Number(photo.id)
          );

        }

      }

      updatePhotoSelectionUI();

    }
  );


document
  .getElementById(
    "favoriteSelectedPhotos"
  )
  .addEventListener(
    "click",
    async () => {

      const selectedPhotos =
        currentPhotos.filter(
          photo =>
            selectedPhotoIds.has(
              Number(photo.id)
            )
        );

      if (!selectedPhotos.length) {
        return;
      }


      const allFavorites =
        selectedPhotos.every(
          photo =>
            Number(photo.favorite) === 1
        );

      const newFavorite =
        !allFavorites;

      const button =
        document.getElementById(
          "favoriteSelectedPhotos"
        );

      button.disabled = true;
      button.textContent =
        "Guardando...";


      try {

        for (
          const photo
          of selectedPhotos
        ) {

          await api(
            `/photos/${photo.id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  favorite:
                    newFavorite
                })
            }
          );

        }


        const albumId =
          currentAlbumId;

        photoSelectionMode =
          false;

        selectedPhotoIds.clear();


        const data =
          await api(
            `/albums/${albumId}`
          );

        renderAlbumView(data);

        await loadAlbums();


      } catch (error) {

        alert(error.message);

      } finally {

        button.disabled = false;

        updatePhotoSelectionUI();

      }

    }
  );


document
  .getElementById(
    "deleteSelectedPhotos"
  )
  .addEventListener(
    "click",
    async () => {

      const selectedPhotos =
        currentPhotos.filter(
          photo =>
            selectedPhotoIds.has(
              Number(photo.id)
            )
        );

      if (!selectedPhotos.length) {
        return;
      }


      const total =
        selectedPhotos.length;

      const confirmed =
        confirm(
          `¿Eliminar ${total} fotografía${
            total === 1
              ? ""
              : "s"
          }?\n\nEsta acción no se puede deshacer.`
        );

      if (!confirmed) {
        return;
      }


      const button =
        document.getElementById(
          "deleteSelectedPhotos"
        );

      button.disabled = true;

      let deleted = 0;
      let deletionError = null;


      for (
        const photo
        of selectedPhotos
      ) {

        button.textContent =
          `Eliminando ${deleted + 1}/${total}`;

        try {

          await api(
            `/photos/${photo.id}`,
            {
              method: "DELETE"
            }
          );

          deleted += 1;

        } catch (error) {

          deletionError =
            error;

          break;

        }

      }


      try {

        const albumId =
          currentAlbumId;

        photoSelectionMode =
          false;

        selectedPhotoIds.clear();


        const data =
          await api(
            `/albums/${albumId}`
          );

        renderAlbumView(data);

        await loadAlbums();


        if (deletionError) {

          alert(
            `Se eliminaron ${deleted} de ${total} fotografías.\n\n${deletionError.message}`
          );

        }

      } catch (error) {

        alert(error.message);

      } finally {

        button.disabled = false;
        button.textContent =
          "Eliminar";

        updatePhotoSelectionUI();

      }

    }
  );


document
  .getElementById(
    "uploadPhotosButton"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "photoUploader"
        )
        .click();

    }
  );


document
  .getElementById(
    "floatingUploadButton"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "photoUploader"
        )
        .click();

    }
  );


document
  .getElementById(
    "photoUploader"
  )
  .addEventListener(
    "change",
    async event => {

      const files =
        [...event.target.files];

      if (
        !files.length ||
        !currentAlbumId
      ) {
        return;
      }

      try {

        for (const file of files) {

          const form =
            new FormData();

          form.append(
            "file",
            file
          );

          const response =
            await fetch(
              `${API}/albums/${currentAlbumId}/photos`,
              {
                method: "POST",
                body: form,
                credentials:
                  "same-origin"
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            data.ok === false
          ) {
            throw new Error(
              data.error ||
              "Error subiendo imagen"
            );
          }
        }

        openAlbum(
          currentAlbumId,
          false
        );

        loadAlbums();

      } catch (error) {

        alert(error.message);

      }

    }
  );
  
  
  
/* =========================================
   VISOR DE FOTOGRAFÍAS
========================================= */

const photoViewer =
  document.getElementById("photoViewer");

const viewerImage =
  document.getElementById("viewerImage");

const viewerCounter =
  document.getElementById("viewerCounter");

const favoritePhotoButton =
  document.getElementById("favoritePhoto");

const slideshowToggleButton =
  document.getElementById(
    "slideshowToggle"
  );

const settingsMenuButton =
  document.getElementById(
    "settingsMenuButton"
  );

const settingsOverlay =
  document.getElementById(
    "settingsOverlay"
  );

const slideshowSpeedInput =
  document.getElementById(
    "slideshowSpeed"
  );

const slideshowSpeedValue =
  document.getElementById(
    "slideshowSpeedValue"
  );

let slideshowTimer = null;
let slideshowRunning = false;
let slideshowDelaySeconds = 5;
let screenWakeLock = null;

try {
  const savedDelay =
    Number(
      localStorage.getItem(
        "blackpinkSlideshowDelay"
      )
    );

  if (
    Number.isFinite(savedDelay) &&
    savedDelay >= 2 &&
    savedDelay <= 10
  ) {
    slideshowDelaySeconds =
      savedDelay;
  }
} catch {
  // La galería funciona aunque el navegador bloquee localStorage.
}

slideshowSpeedInput.value =
  String(slideshowDelaySeconds);

slideshowSpeedValue.textContent =
  `${slideshowDelaySeconds} s`;


function openPhotoViewer(
  index,
  addHistory = true
) {
  if (!currentPhotos.length) {
    return;
  }

  currentPhotoIndex = index;
  updatePhotoViewer();

  photoViewer.classList.add("show");
  document.body.style.overflow = "hidden";

  if (addHistory) {
    history.pushState(
      {
        view: "photo",
        albumId: currentAlbumId,
        photoIndex: index
      },
      "",
      `#album-${currentAlbumId}-photo-${index + 1}`
    );
  }
}


function updatePhotoViewer() {

  const photo =
    currentPhotos[currentPhotoIndex];

  if (!photo) {
    return;
  }

  const coverButton =
    document.getElementById(
      "setCoverPhoto"
    );

  if (
    currentAlbum &&
    currentAlbum.cover_key ===
      photo.r2_key
  ) {

    coverButton.textContent =
      "✓ Es portada";

    coverButton.disabled = true;

  } else {

    coverButton.textContent =
      "♡ Portada";

    coverButton.disabled = false;

  }


  viewerImage.classList.remove(
    "slideshow-change"
  );

  viewerImage.src =
    `${API}/images/${
      encodeURIComponent(
        photo.r2_key
      )
    }`;

  // Reinicia una animación sutil al cambiar de fotografía.
  void viewerImage.offsetWidth;

  viewerImage.classList.add(
    "slideshow-change"
  );


  viewerCounter.textContent =
    `${currentPhotoIndex + 1} / ${currentPhotos.length}`;

  favoritePhotoButton.textContent =
    Number(photo.favorite) === 1
      ? "♥ Favorito"
      : "♡ Favorito";


  slideshowToggleButton.disabled =
    currentPhotos.length < 2;
}


function closePhotoViewer() {

  stopSlideshow();

  photoViewer.classList.remove("show");

  viewerImage.src = "";

  document.body.style.overflow = "";
}


function showPreviousPhoto() {

  if (!currentPhotos.length) {
    return;
  }

  currentPhotoIndex =
    (
      currentPhotoIndex -
      1 +
      currentPhotos.length
    ) % currentPhotos.length;

  updatePhotoViewer();
  syncPhotoHistoryState();
}


function showNextPhoto() {

  if (!currentPhotos.length) {
    return;
  }

  currentPhotoIndex =
    (
      currentPhotoIndex + 1
    ) % currentPhotos.length;

  updatePhotoViewer();
  syncPhotoHistoryState();
}


function syncPhotoHistoryState() {

  if (
    history.state?.view !==
      "photo" ||
    !currentAlbumId
  ) {
    return;
  }

  history.replaceState(
    {
      view: "photo",
      albumId: currentAlbumId,
      photoIndex:
        currentPhotoIndex
    },
    "",
    `#album-${currentAlbumId}-photo-${currentPhotoIndex + 1}`
  );
}


async function requestScreenWakeLock() {

  if (
    !("wakeLock" in navigator) ||
    document.visibilityState !== "visible"
  ) {
    return;
  }

  try {

    if (!screenWakeLock) {

      screenWakeLock =
        await navigator.wakeLock.request(
          "screen"
        );

      screenWakeLock.addEventListener(
        "release",
        () => {
          screenWakeLock = null;
        }
      );

    }

  } catch (error) {

    console.warn(
      "No se pudo mantener la pantalla activa:",
      error
    );

    screenWakeLock = null;

  }
}


async function releaseScreenWakeLock() {

  if (!screenWakeLock) {
    return;
  }

  const lock =
    screenWakeLock;

  screenWakeLock = null;

  try {
    await lock.release();
  } catch {
    // Puede haberse liberado automáticamente al ocultar la pestaña.
  }
}


function scheduleSlideshow() {

  clearTimeout(
    slideshowTimer
  );

  if (
    !slideshowRunning ||
    currentPhotos.length < 2
  ) {
    return;
  }

  slideshowTimer =
    setTimeout(
      () => {

        showNextPhoto();

        scheduleSlideshow();

      },
      slideshowDelaySeconds *
        1000
    );
}


async function startSlideshow() {

  if (currentPhotos.length < 2) {
    return;
  }

  slideshowRunning = true;

  await requestScreenWakeLock();

  slideshowToggleButton
    .classList.add(
      "is-playing"
    );

  slideshowToggleButton
    .setAttribute(
      "aria-label",
      "Pausar presentación automática"
    );

  slideshowToggleButton.textContent =
    "⏸️";

  scheduleSlideshow();
}


function stopSlideshow() {

  slideshowRunning = false;

  void releaseScreenWakeLock();

  clearTimeout(
    slideshowTimer
  );

  slideshowTimer = null;

  if (slideshowToggleButton) {

    slideshowToggleButton
      .classList.remove(
        "is-playing"
      );

    slideshowToggleButton
      .setAttribute(
        "aria-label",
        "Iniciar presentación automática"
      );

    slideshowToggleButton.textContent =
      "▶️";

  }
}


function restartSlideshowCountdown() {

  if (slideshowRunning) {
    scheduleSlideshow();
  }
}


document
  .getElementById("closeViewer")
  .addEventListener(
    "click",
    () => {

      if (
        history.state?.view === "photo"
      ) {
        history.back();
      } else {
        closePhotoViewer();
      }

    }
  );


document
  .getElementById("previousPhoto")
  .addEventListener(
    "click",
    () => {
      showPreviousPhoto();
      restartSlideshowCountdown();
    }
  );


document
  .getElementById("nextPhoto")
  .addEventListener(
    "click",
    () => {
      showNextPhoto();
      restartSlideshowCountdown();
    }
  );


slideshowToggleButton
  .addEventListener(
    "click",
    async () => {

      if (slideshowRunning) {
        stopSlideshow();
      } else {
        await startSlideshow();
      }

    }
  );


document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState ===
        "visible" &&
      slideshowRunning
    ) {

      await requestScreenWakeLock();

    } else if (
      document.visibilityState !==
        "visible"
    ) {

      await releaseScreenWakeLock();

    }

  }
);


/* =========================================
   MENÚ DE AJUSTES
========================================= */

function openSettings() {

  settingsOverlay.hidden = false;

  settingsMenuButton.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.classList.add(
    "settings-open"
  );
}


function closeSettings() {

  settingsOverlay.hidden = true;

  settingsMenuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.classList.remove(
    "settings-open"
  );
}


settingsMenuButton.addEventListener(
  "click",
  openSettings
);


document
  .getElementById("closeSettings")
  .addEventListener(
    "click",
    closeSettings
  );


document
  .getElementById("settingsBackdrop")
  .addEventListener(
    "click",
    closeSettings
  );


slideshowSpeedInput.addEventListener(
  "input",
  () => {

    const value =
      Math.min(
        10,
        Math.max(
          2,
          Number(
            slideshowSpeedInput.value
          ) || 5
        )
      );

    slideshowDelaySeconds =
      value;

    slideshowSpeedValue.textContent =
      `${value} s`;

    try {
      localStorage.setItem(
        "blackpinkSlideshowDelay",
        String(value)
      );
    } catch {
      // El ajuste sigue funcionando durante la sesión.
    }

    restartSlideshowCountdown();

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !settingsOverlay.hidden
    ) {
      closeSettings();
    }

  }
);


/* PORTADA DEL ÁLBUM */

document
  .getElementById("setCoverPhoto")
  .addEventListener(
    "click",
    async () => {

      const photo =
        currentPhotos[currentPhotoIndex];

      if (!photo || !currentAlbumId) {
        return;
      }

      const button =
        document.getElementById("setCoverPhoto");

      button.disabled = true;
      button.textContent = "Cambiando...";

      try {

        await api(
          `/albums/${currentAlbumId}/cover`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              photoId: photo.id
            })
          }
        );

        const data =
          await api(
            `/albums/${currentAlbumId}`
          );

        renderAlbumView(data);
        await loadAlbums();

      } catch (error) {

        alert(error.message);

      } finally {

        updatePhotoViewer();

      }
    }
  );


/* FAVORITO */

favoritePhotoButton.addEventListener(
  "click",
  async () => {

    const photo =
      currentPhotos[currentPhotoIndex];

    if (!photo) {
      return;
    }

    const newFavorite =
      Number(photo.favorite) !== 1;

    favoritePhotoButton.disabled = true;

    try {

      await api(
        `/photos/${photo.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            favorite: newFavorite
          })
        }
      );

      photo.favorite =
        newFavorite ? 1 : 0;

      updatePhotoViewer();

      // Actualiza los corazones de la cuadrícula
      const data =
        await api(
          `/albums/${currentAlbumId}`
        );

      renderAlbumView(data);

      if (favoritesOnly) {
        await loadFavoritesView();
      }

    } catch (error) {

      alert(error.message);

    } finally {

      favoritePhotoButton.disabled =
        false;
    }
  }
);


/* ELIMINAR FOTO */

document
  .getElementById("deletePhoto")
  .addEventListener(
    "click",
    async () => {

      const photo =
        currentPhotos[currentPhotoIndex];

      if (!photo) {
        return;
      }

      const confirmed =
        confirm(
          "¿Quieres eliminar esta fotografía? Esta acción no se puede deshacer."
        );

      if (!confirmed) {
        return;
      }

      try {

        await api(
          `/photos/${photo.id}`,
          {
            method: "DELETE"
          }
        );

        currentPhotos.splice(
          currentPhotoIndex,
          1
        );

        if (!currentPhotos.length) {

          stopSlideshow();
          closePhotoViewer();

          await openAlbum(
            currentAlbumId,
            false
          );

          await loadAlbums();

          return;
        }

        if (
          currentPhotoIndex >=
          currentPhotos.length
        ) {
          currentPhotoIndex =
            currentPhotos.length - 1;
        }

        if (
          currentPhotos.length < 2
        ) {
          stopSlideshow();
        }

        updatePhotoViewer();

        const data =
          await api(
            `/albums/${currentAlbumId}`
          );

        renderAlbumView(data);

        await loadAlbums();

      } catch (error) {

        alert(error.message);
      }
    }
  );
  
  
document
  .getElementById("fullscreenPhoto")
  .addEventListener(
    "click",
    async () => {

      try {

        if (!document.fullscreenElement) {

          await viewerImage.requestFullscreen();

        } else {

          await document.exitFullscreen();

        }

      } catch (error) {

        console.error(
          "Pantalla completa no disponible:",
          error
        );

      }

    }
  );
  
  
  
window.addEventListener(
  "popstate",
  event => {

    // FOTO
    if (
      event.state?.view === "photo" &&
      event.state.albumId
    ) {

      openAlbum(
        event.state.albumId,
        false
      ).then(() => {

        openPhotoViewer(
          event.state.photoIndex || 0,
          false
        );

      });

      return;
    }


    // ÁLBUM
    if (
      event.state?.view === "album" &&
      event.state.albumId
    ) {

      closePhotoViewer();

      openAlbum(
        event.state.albumId,
        false
      );

      return;
    }


    // GALERÍA
    closePhotoViewer();
    closeAlbumView();

  }
);

/* =========================================
   EDITAR ÁLBUM
========================================= */

const editAlbumModal =
  document.getElementById("editAlbumModal");

const editAlbumForm =
  document.getElementById("editAlbumForm");


document
  .getElementById("editAlbumButton")
  .addEventListener(
    "click",
    () => {

      if (!currentAlbum) {
        return;
      }

      document
        .getElementById("editAlbumName")
        .value =
          currentAlbum.name || "";

      document
        .getElementById(
          "editAlbumDescription"
        )
        .value =
          currentAlbum.description || "";


      const select =
        document.getElementById(
          "editAlbumCategory"
        );

      select.innerHTML = "";

/*
  Primero aseguramos que la categoría
  actual del álbum siempre exista.
*/

if (currentAlbum.category) {

  const currentOption =
    document.createElement("option");

  currentOption.value =
    currentAlbum.category;

  currentOption.textContent =
    currentAlbum.category;

  currentOption.selected = true;

  select.appendChild(currentOption);
}


/*
  Después agregamos las demás
  categorías disponibles.
*/

for (const category of categoryList) {

  if (
    category.name ===
    currentAlbum.category
  ) {
    continue;
  }

  const option =
    document.createElement("option");

  option.value =
    category.name;

  option.textContent =
    category.name;

  select.appendChild(option);
}


      editAlbumModal
        .classList.add("show");

      document.body.style.overflow = "hidden";

    }
  );


function closeEditAlbum() {

  editAlbumModal
    .classList.remove("show");

  document.body.style.overflow = "";

}


document
  .getElementById("cancelEditAlbum")
  .addEventListener(
    "click",
    closeEditAlbum
  );


editAlbumModal.addEventListener(
  "click",
  event => {

    if (
      event.target === editAlbumModal
    ) {
      closeEditAlbum();
    }

  }
);


editAlbumForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!currentAlbumId) {
      return;
    }

    const button =
      document.getElementById(
        "saveEditAlbum"
      );

    const name =
      document
        .getElementById("editAlbumName")
        .value
        .trim();

    const category =
      document
        .getElementById(
          "editAlbumCategory"
        )
        .value;

    const description =
      document
        .getElementById(
          "editAlbumDescription"
        )
        .value
        .trim();
        
        if (!name) {
  alert("Escribe un nombre para el álbum.");
  return;
}

if (!category) {
  alert("Selecciona una categoría.");
  return;
}

    button.disabled = true;
    button.textContent =
      "Guardando...";

    try {

      const albumId = currentAlbumId;

      await api(
        `/albums/${albumId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            category,
            description
          })
        }
      );

      closeEditAlbum();

      // Recargamos el álbum directamente desde D1 para mostrar
      // inmediatamente el nombre/categoría/descripción actualizados.
      const updatedData = await api(`/albums/${albumId}`);
      renderAlbumView(updatedData);

      await loadAlbums();

    } catch (error) {

      alert(error.message);

    } finally {

      button.disabled = false;
      button.textContent =
        "Guardar";
    }

  }
);

/* =========================================
   ELIMINAR ÁLBUM
========================================= */

document
  .getElementById("deleteAlbumButton")
  .addEventListener(
    "click",
    async () => {

      if (
        !currentAlbumId ||
        !currentAlbum
      ) {
        return;
      }

      const confirmed =
        confirm(
          `¿Eliminar "${currentAlbum.name}"?\n\n` +
          "También se eliminarán todas sus fotografías. " +
          "Esta acción no se puede deshacer."
        );

      if (!confirmed) {
        return;
      }

      try {

        await api(
          `/albums/${currentAlbumId}`,
          {
            method: "DELETE"
          }
        );

        /*
          Como entramos al álbum creando
          una entrada de historial,
          volvemos correctamente a
          la galería.
        */

        if (
          history.state?.view ===
          "album"
        ) {

          history.back();

        } else {

          closeAlbumView();

        }

        await loadAlbums();

      } catch (error) {

        alert(error.message);

      }

    }
  );
/* =========================================
   ADMINISTRAR CATEGORÍAS
========================================= */

const manageCategoryModal =
  document.getElementById(
    "manageCategoryModal"
  );

const manageCategoryForm =
  document.getElementById(
    "manageCategoryForm"
  );

const manageCategoryName =
  document.getElementById(
    "manageCategoryName"
  );

let categoryBeingEdited = null;


function openManageCategory(category) {

  categoryBeingEdited =
    category;

  manageCategoryName.value =
    category.name;

  manageCategoryModal
    .classList.add("show");

  document.body.style.overflow =
    "hidden";

  setTimeout(() => {

    manageCategoryName.focus();

    manageCategoryName.select();

  }, 100);
}


function closeManageCategory() {

  manageCategoryModal
    .classList.remove("show");

  document.body.style.overflow = "";

  categoryBeingEdited = null;

  manageCategoryForm.reset();
}


document
  .getElementById(
    "cancelManageCategory"
  )
  .addEventListener(
    "click",
    closeManageCategory
  );


manageCategoryModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      manageCategoryModal
    ) {

      closeManageCategory();

    }

  }
);


/* RENOMBRAR */

manageCategoryForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if (!categoryBeingEdited) {
      return;
    }

    const oldName =
      categoryBeingEdited.name;

    const newName =
      manageCategoryName
        .value
        .trim();

    if (!newName) {
      return;
    }

    const button =
      document.getElementById(
        "saveCategoryChanges"
      );

    button.disabled = true;
    button.textContent =
      "Guardando...";

    try {

      await api(
        `/categories/${categoryBeingEdited.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name: newName
          })
        }
      );


      if (
        currentCategory === oldName
      ) {

        currentCategory =
          newName;

      }


      closeManageCategory();

      await loadCategories();
      await loadAlbums();

    } catch (error) {

      alert(error.message);

    } finally {

      button.disabled = false;
      button.textContent =
        "Guardar";

    }

  }
);


/* ELIMINAR */

document
  .getElementById(
    "deleteCategory"
  )
  .addEventListener(
    "click",
    async () => {

      if (!categoryBeingEdited) {
        return;
      }

      const category =
        categoryBeingEdited;

      const confirmed =
        confirm(
          `¿Eliminar la categoría "${category.name}"?\n\n` +
          "Los álbumes no se eliminarán. " +
          "Pasarán a Sin categoría."
        );

      if (!confirmed) {
        return;
      }


      const button =
        document.getElementById(
          "deleteCategory"
        );

      button.disabled = true;
      button.textContent =
        "Eliminando...";

      try {

        await api(
          `/categories/${category.id}`,
          {
            method: "DELETE"
          }
        );


        if (
          currentCategory ===
          category.name
        ) {

          currentCategory =
            "Todas";

        }


        closeManageCategory();

        await loadCategories();
        await loadAlbums();

      } catch (error) {

        alert(error.message);

      } finally {

        button.disabled = false;
        button.textContent =
          "Eliminar";

      }

    }
  );


/* =========================================
   ÁLBUM FAVORITO
========================================= */

document
  .getElementById("favoriteAlbumButton")
  .addEventListener(
    "click",
    async () => {

      if (!currentAlbumId || !currentAlbum) {
        return;
      }

      const button =
        document.getElementById(
          "favoriteAlbumButton"
        );

      const favorite =
        Number(currentAlbum.favorite) !== 1;

      button.disabled = true;

      try {

        await api(
          `/albums/${currentAlbumId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              favorite
            })
          }
        );

        const data =
          await api(
            `/albums/${currentAlbumId}`
          );

        renderAlbumView(data);

        await loadAlbums();

      } catch (error) {

        alert(error.message);

      } finally {

        button.disabled = false;

      }

    }
  );
  
  
/* =========================================
   VISTA DE FAVORITOS
========================================= */

async function loadFavoritesView() {

  const albumsGrid =
    document.getElementById(
      "favoriteAlbumsGrid"
    );

  const photosGrid =
    document.getElementById(
      "favoritePhotosGrid"
    );

  albumsGrid.innerHTML =
    '<div class="loading">Cargando álbumes favoritos...</div>';

  photosGrid.innerHTML =
    '<div class="loading">Cargando fotos favoritas...</div>';

  try {

    const [
      albumsData,
      photosData
    ] = await Promise.all([
      api("/albums?favorites=1"),
      api("/photos?favorites=1")
    ]);

    renderFavoriteAlbums(
      albumsData.albums || []
    );

    renderFavoritePhotos(
      photosData.photos || []
    );

  } catch (error) {

    albumsGrid.innerHTML = "";
    photosGrid.innerHTML = "";

    message.className =
      "message error";

    message.textContent =
      error.message;

  }
}


function renderFavoriteAlbums(albums) {

  const grid =
    document.getElementById(
      "favoriteAlbumsGrid"
    );

  const count =
    document.getElementById(
      "favoriteAlbumsCount"
    );

  count.textContent =
    String(albums.length);

  grid.innerHTML = "";

  if (!albums.length) {

    grid.innerHTML = `
      <div class="favorite-empty">
        <strong>
          No tienes álbumes favoritos
        </strong>
        Abre un álbum y toca ♡ Álbum favorito.
      </div>
    `;

    return;
  }


  for (const album of albums) {

    const card =
      document.createElement("article");

    card.className = "album";

    let cover;

    if (album.cover_key) {

      const imageURL =
        `${API}/images/${
          encodeURIComponent(
            album.cover_key
          )
        }`;

      cover = `
        <div class="cover">
          <img
            src="${imageURL}"
            alt=""
            loading="lazy"
          >
        </div>
      `;

    } else {

      cover = `
        <div class="cover">
          BP
        </div>
      `;

    }


    card.innerHTML = `
      ${cover}

      <div class="album-info">

        <p class="album-name"></p>

        <p class="album-count">
          ♥
          ${album.photo_count || 0}
          foto${
            Number(album.photo_count) === 1
              ? ""
              : "s"
          }
        </p>

      </div>
    `;

    card
      .querySelector(
        ".album-name"
      )
      .textContent =
        album.name;


    card.addEventListener(
      "click",
      () => openAlbum(album.id)
    );


    grid.appendChild(card);

  }
}


function renderFavoritePhotos(photos) {

  const grid =
    document.getElementById(
      "favoritePhotosGrid"
    );

  const count =
    document.getElementById(
      "favoritePhotosCount"
    );

  count.textContent =
    String(photos.length);

  grid.innerHTML = "";

  if (!photos.length) {

    grid.innerHTML = `
      <div class="favorite-empty">
        <strong>
          No tienes fotos favoritas
        </strong>
        Abre una fotografía y toca ♡ Favorito.
      </div>
    `;

    return;
  }


  for (const photo of photos) {

    const item =
      document.createElement("article");

    item.className =
      "favorite-photo-card";


    const image =
      document.createElement("img");

    image.src =
      `${API}/images/${
        encodeURIComponent(
          photo.r2_key
        )
      }`;

    image.loading = "lazy";

    image.alt =
      photo.title ||
      photo.filename ||
      "Fotografía";


    const heart =
      document.createElement("div");

    heart.className =
      "favorite-photo-heart";

    heart.textContent = "♥";


    const overlay =
      document.createElement("div");

    overlay.className =
      "favorite-photo-overlay";


    const albumName =
      document.createElement("span");

    albumName.className =
      "favorite-photo-album";

    albumName.textContent =
      photo.album_name ||
      "Álbum";


    overlay.appendChild(
      albumName
    );

    item.appendChild(image);
    item.appendChild(heart);
    item.appendChild(overlay);


    item.addEventListener(
      "click",
      async () => {

        await openAlbum(
          photo.album_id
        );

        const index =
          currentPhotos.findIndex(
            currentPhoto =>
              Number(currentPhoto.id) ===
              Number(photo.id)
          );

        if (index !== -1) {

          openPhotoViewer(
            index
          );

        }

      }
    );


    grid.appendChild(item);

  }
}


init();
