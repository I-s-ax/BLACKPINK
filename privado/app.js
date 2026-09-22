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

  gallery.innerHTML =
    '<div class="loading">Cargando...</div>';

  message.textContent = "";

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

  if (favoritesOnly) {
    params.set("favorites", "1");
  }

  try {

    const data = await api(
      "/albums?" + params.toString()
    );

    renderAlbums(data.albums);

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

      </div>
    `;

    card.querySelector(
      ".album-name"
    ).textContent = album.name;

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
        .getElementById("albumDescription")
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


  item.appendChild(button);
  item.appendChild(menuButton);

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

document
  .getElementById("favoritesButton")
  .addEventListener(
    "click",
    event => {

      favoritesOnly =
        !favoritesOnly;

      event.currentTarget
        .classList.toggle(
          "action",
          favoritesOnly
        );

      event.currentTarget
        .classList.toggle(
          "light",
          !favoritesOnly
        );

      loadAlbums();
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

async function openAlbum(
  id,
  addHistory = true
) {

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


function renderAlbumView(data) {
  
  currentAlbum = data.album;

  const albumView =
    document.getElementById(
      "albumView"
    );

  document
    .getElementById("albumTitle")
    .textContent =
      data.album.name;

  document
    .getElementById("albumInfo")
    .textContent =
      `${data.photos.length} foto(s)`;

  const grid =
    document.getElementById(
      "photoGrid"
    );

  grid.innerHTML = "";

  currentPhotos = data.photos || [];

for (let i = 0; i < currentPhotos.length; i++) {

  const photo = currentPhotos[i];

  const item =
    document.createElement("div");

  item.className = "photo-item";

  const image =
    document.createElement("img");

  image.src =
    `${API}/images/${
      encodeURIComponent(photo.r2_key)
    }`;

  image.loading = "lazy";
  image.alt =
    photo.title || photo.filename || "Fotografía";

  item.appendChild(image);


  if (Number(photo.favorite) === 1) {

    const heart =
      document.createElement("div");

    heart.className =
      "photo-favorite-badge";

    heart.textContent = "♥";

    item.appendChild(heart);
  }


  item.addEventListener(
    "click",
    () => openPhotoViewer(i)
  );

  grid.appendChild(item);
}

  albumView.style.display =
    "block";
}


document
  .getElementById("backToAlbums")
  .addEventListener(
    "click",
    () => {

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

  document
    .getElementById("albumView")
    .style.display = "none";

  currentAlbumId = null;
  currentPhotos = [];

  window.scrollTo(0, 0);
}
  
  
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
    
    const coverButton =
  document.getElementById("setCoverPhoto");

if (
  currentAlbum &&
  currentAlbum.cover_key === photo.r2_key
) {
  coverButton.textContent = "✓ Es portada";
  coverButton.disabled = true;
} else {
  coverButton.textContent = "♡ Portada";
  coverButton.disabled = false;
}

  if (!photo) {
    return;
  }

  viewerImage.src =
    `${API}/images/${
      encodeURIComponent(photo.r2_key)
    }`;

  viewerCounter.textContent =
    `${currentPhotoIndex + 1} / ${currentPhotos.length}`;

  favoritePhotoButton.textContent =
    Number(photo.favorite) === 1
      ? "♥ Favorito"
      : "♡ Favorito";
}


function closePhotoViewer() {

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
    showPreviousPhoto
  );


document
  .getElementById("nextPhoto")
  .addEventListener(
    "click",
    showNextPhoto
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

          closePhotoViewer();

          await openAlbum(
            currentAlbumId
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

init();
