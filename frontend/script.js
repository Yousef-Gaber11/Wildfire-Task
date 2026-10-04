//eventtype for Metadata
const eventTypeNames = {
  0: "Division Break",
  1: "Aerial Hazard",
  4: "Camp",
  6: "Drop Point",
  7: "Fire Origin",
  8: "Fire Station",
  9: "First Aid Station",
  10: "Helibase",
  12: "Hot Spot",
  16: "Lookout",
  17: "Telephone / MediVac",
  18: "Mobile Weather Unit",
  20: "Safety Zone",
  22: "Spot Fire",
  25: "Water Source",
  26: "Wind Speed Direction",
};

// ! Notification fun: Display success or error messages to the user
function showNotification(message, type = "success") {
  const notif = document.getElementById("app-notification");
  if (!notif) return;

  notif.textContent = message;
  notif.style.backgroundColor = type === "success" ? "#2ecc71" : "#e74c3c";

  notif.classList.remove("hidden");
  notif.style.opacity = "1";

  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => {
      notif.classList.add("hidden");
    }, 300);
  }, 2000);
}

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/geometry/Point",
], function (Map, MapView, FeatureLayer, Point) {
  // Initialize the map with a vector basemap
  const map = new Map({
    basemap: "topo-vector",
  });

  // Initialize the MapView and hide default UI components except attribution
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-119.4179, 36.7783],
    zoom: 4,
    // The default user interface components are available because I am using the map's zoom controls.
    ui: {
      components: ["attribution"],
    },
  });

  // ! ZOOM CONTROLS

  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");

  zoomInBtn.addEventListener("click", () => {
    view.goTo(
      {
        zoom: view.zoom + 1,
        center: view.center,
      },
      {
        duration: 200,
      },
    );
  });

  zoomOutBtn.addEventListener("click", () => {
    view.goTo(
      {
        zoom: view.zoom - 1,
        center: view.center,
      },
      {
        duration: 200,
      },
    );
  });

  // Define the wildfire feature layer with a performance-optimized definition expression filter
  const wildfireLayer = new FeatureLayer({
    url: "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/0",
    outFields: ["*"],
    definitionExpression: "eventtype IN (7, 12, 22)",
  });

  map.add(wildfireLayer);

  // Centralized state array to track selected features
  let selectedFires = [];

  // DOM element references for the custom popup component
  const popupEl = document.getElementById("custom-popup");
  const popupId = document.getElementById("popup-id");
  const popupName = document.getElementById("popup-name");
  const popupCoords = document.getElementById("popup-coords");
  const popupClose = document.getElementById("popup-close");

  // Close the custom popup
  popupClose.addEventListener("click", () => {
    popupEl.classList.add("hidden");
  });

  // Map Click Handler: Feature selection via hitTest and custom popup display
  view.on("click", async function (event) {
    const response = await view.hitTest(event);
    const results = response.results.filter(
      (result) => result.graphic.layer === wildfireLayer,
    );

    if (results.length > 0) {
      const graphic = results[0].graphic;
      const objectId =
        graphic.attributes.objectid || graphic.attributes.OBJECTID;

      // 1
      // const fireName = graphic.attributes.description || "Wildfire Point";
      // 2
      // const fireName =
      //   graphic.attributes.description ||
      //   `Wildfire Point (Type: ${graphic.attributes.eventtype})`;
      // 3
      const eventTypeCode = graphic.attributes.eventtype;
      const fallbackName = eventTypeNames[eventTypeCode] || "Wildfire Point";
      const fireName = fallbackName;

      const lon = graphic.geometry
        ? graphic.geometry.longitude || graphic.geometry.x
        : 0;
      const lat = graphic.geometry
        ? graphic.geometry.latitude || graphic.geometry.y
        : 0;

      if (objectId) {
        // Update and position the custom popup
        popupId.textContent = objectId;
        popupName.textContent = fireName;
        popupCoords.textContent = `${lon.toFixed(4)}, ${lat.toFixed(4)}`;

        popupEl.style.left = `${event.x + 15}px`;
        popupEl.style.top = `${event.y - 15}px`;
        popupEl.classList.remove("hidden");

        // Format payload object matching backend expectations
        const fireObject = {
          id: objectId,
          attributes: {
            OBJECTID: objectId,
            FIRE_NAME: fireName,
            EVENT_TYPE: graphic.attributes.eventtype,
          },
          geometry: { x: lon, y: lat },
        };

        // Prevent duplicate entries in the selection queue
        if (!selectedFires.some((f) => f.attributes.OBJECTID === objectId)) {
          selectedFires.push(fireObject);
          updateSidebarUI();
        }
      }
    } else {
      // Hide popup if clicking on empty space
      popupEl.classList.add("hidden");
    }
  });

  // Sidebar UI Renderer & State Synchronization
  function updateSidebarUI() {
    const container = document.getElementById("fires-list-container");
    container.innerHTML = "";

    if (selectedFires.length === 0) {
      container.innerHTML = `<p id="empty-msg" style="color: #888; text-align: center; margin-top: 20px;">No fires selected yet.</p>`;
      return;
    }

    selectedFires.forEach((fire) => {
      const card = document.createElement("div");
      card.className = "fire-card";
      card.innerHTML = `
        <div class="fire-card-info" title="ID: ${fire.attributes.OBJECTID} - ${fire.attributes.FIRE_NAME}">
          <strong>ID: ${fire.attributes.OBJECTID}</strong><br>${fire.attributes.FIRE_NAME}
        </div>
        <button class="delete-single-btn" data-id="${fire.attributes.OBJECTID}">Delete</button>
      `;

      // Handle single item removal from the sidebar queue
      card
        .querySelector(".delete-single-btn")
        .addEventListener("click", (e) => {
          const idToDelete = Number(e.target.getAttribute("data-id"));
          selectedFires = selectedFires.filter(
            (f) => f.attributes.OBJECTID !== idToDelete,
          );
          updateSidebarUI();
        });

      container.appendChild(card);
    });
  }

  // Client-Side Filtering: Remove selected features from the map view
  document
    .getElementById("delete-btn")
    .addEventListener("click", async function () {
      if (selectedFires.length === 0) {
        showNotification(
          "Please select at least one fire from the list first before deleting.",
          "error",
        );
        return;
      }

      try {
        const layerView = await view.whenLayerView(wildfireLayer);
        const objectIds = selectedFires.map((f) => f.attributes.OBJECTID);

        if (objectIds.length > 0) {
          layerView.filter = {
            where: `OBJECTID NOT IN (${objectIds.join(",")})`,
          };
          showNotification(
            "Selected fires successfully removed from the map view.",
            "success",
          );
        }

        selectedFires = [];
        updateSidebarUI();
        popupEl.classList.add("hidden");
      } catch (error) {
        console.error("Error updating layer view filter:", error);
      }
    });

  // Backend Integration: Persist selected data to server via C# .NET Web API
  document
    .getElementById("save-btn")
    .addEventListener("click", async function () {
      if (selectedFires.length === 0) {
        showNotification(
          "Please select at least one fire from the map to save.",
          "error",
        );
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/fires", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedFires),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(result);
          showNotification(
            result.message || "Data successfully saved to server storage!",
            "success",
          );

          selectedFires = [];
          updateSidebarUI();
          popupEl.classList.add("hidden");
        } else {
          showNotification(
            "Server responded with an error while saving data.",
            "error",
          );
        }
      } catch (error) {
        console.error("Connection Error:", error);
        showNotification(
          "Failed to connect to backend API. Please ensure the C# server is running.",
          "error",
        );
      }
    });
});
