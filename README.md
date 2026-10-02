# Wildfire Management System

An interactive wildfire-monitoring application built around the ArcGIS Maps SDK for JavaScript and an ASP.NET Core Web API. Users can inspect filtered wildfire features on a vector basemap, queue selected fires in a synchronized sidebar, remove queued features from the current map view, and persist selected records to JSON storage.

> **Project status:** This repository is a focused local-development application. The backend uses a JSON file rather than a database, and the frontend currently loads the ArcGIS sample Wildfire FeatureServer directly from the browser.

## Features

- ArcGIS `MapView` with the `topo-vector` basemap centered on California.
- `FeatureLayer.definitionExpression` limits the initial dataset to event types `7`, `12`, and `22`.
- Map clicks use `hitTest` and are restricted to the wildfire layer.
- A custom, screen-positioned popup displays the selected fire ID, name, and coordinates.
- A sidebar queue prevents duplicate selections and supports per-item removal.
- A client-side `LayerView.filter` hides selected `OBJECTID` values without changing the source service.
- A `POST /api/fires` endpoint appends selected records to `saved_fires.json`.
- Swagger/OpenAPI is available in the ASP.NET Core development host.

## Architecture

```text
frontend/
  index.html       Page structure, ArcGIS CDN references, popup and sidebar markup
  script.js        Map initialization, selection state, UI events and API calls
  style.css        Application layout, sidebar, popup and control styling

backend/WildfireApi/
  Program.cs       Service registration, CORS, OpenAPI and middleware pipeline
  Controllers/
    FiresController.cs
                    POST endpoint and JSON persistence/merge behavior
  Model/
    FireData.cs    Request DTOs for ID, attributes and point geometry
  Properties/
    launchSettings.json
                    Development URLs and environment configuration
  saved_fires.json Runtime data file (created or updated by the API)
```

See [DOCUMENTATION.md](DOCUMENTATION.md) for the module-by-module technical reference, data lifecycle, code review notes, and production recommendations.

## Technology Stack

### Frontend

- HTML5 and CSS3
- JavaScript ES6+
- ArcGIS Maps SDK for JavaScript 4.31, loaded from the ArcGIS CDN
- ArcGIS `Map`, `MapView`, `FeatureLayer`, and `hitTest` APIs
- Browser Fetch API for backend integration

### Backend

- ASP.NET Core Web API targeting `.NET 10` (`net10.0`)
- C# controllers and model classes
- `System.Text.Json` for serialization
- Swagger/OpenAPI through `Microsoft.AspNetCore.OpenApi` and `Swashbuckle.AspNetCore`
- Local JSON-file persistence outside the compiled `bin` directory

## Prerequisites

Install the following before running the project:

1. The .NET 10 SDK, available from the [.NET download page](https://dotnet.microsoft.com/download).
2. A modern browser with network access to `https://js.arcgis.com` and the ArcGIS sample FeatureServer.
3. A static frontend server, such as the VS Code Live Server extension, Python's built-in HTTP server, or another equivalent server.

No frontend package installation is required. The frontend uses the ArcGIS CDN and has no `package.json`.

## Run Locally

### 1. Start the backend on the frontend's configured API port

The current `frontend/script.js` posts to `http://localhost:5000/api/fires`. From the repository root, run:

```powershell
cd backend\WildfireApi
dotnet restore
dotnet run --urls http://localhost:5000
```

Keep this terminal open. The API is now available at `http://localhost:5000/api/fires`.

The normal `launchSettings.json` HTTP profile uses port `5135`. If you instead start the project through Visual Studio or run `dotnet run` without the URL override, update the frontend API URL and the CORS origin together before testing (see [Configuration alignment](#configuration-alignment)).

### 2. Verify the backend

With the development server running, open:

- Swagger UI: `http://localhost:5000/swagger`
- OpenAPI document: `http://localhost:5000/openapi/v1.json`

The only application endpoint currently implemented is:

```text
POST http://localhost:5000/api/fires
Content-Type: application/json
```

The request body is a non-empty JSON array of fire objects. A successful request returns HTTP `200` with a message and the total number of stored records.

### 3. Start the frontend from the allowed CORS origin

Open a second terminal and run a static server from `frontend`:

```powershell
cd frontend
```

Then choose one of these options:

- **VS Code Live Server:** open `index.html`, choose **Open with Live Server**, and ensure the page is served as `http://127.0.0.1:5500`.
- **Equivalent static server:** serve the directory on port `5500` and use the `127.0.0.1` hostname.

Open `http://127.0.0.1:5500/index.html` in the browser. Do not rely on opening the file as `file://...`; a static HTTP origin makes CORS behavior predictable.

### 4. Exercise the application

1. Wait for the ArcGIS map and wildfire layer to load.
2. Click a displayed wildfire point. The fire is shown in the custom popup and added once to the **Selected Fires List**.
3. Use an individual **Delete** button to remove an item from the queue only.
4. Use **Remove from Map** to apply an `OBJECTID NOT IN (...)` client-side `LayerView` filter and clear the selection queue.
5. Select one or more points and choose **Save to JSON** to append them to the backend's `saved_fires.json`.

## Configuration alignment

The checked-in development settings and frontend currently use different defaults:

| Concern | Current value |
| --- | --- |
| Frontend API URL | `http://localhost:5000/api/fires` |
| `launchSettings.json` HTTP URL | `http://localhost:5135` |
| Allowed frontend CORS origin | `http://127.0.0.1:5500` |

The documented command-line startup (`dotnet run --urls http://localhost:5000`) works with the current frontend and CORS policy. For a cleaner team setup, choose one canonical API port and update both `frontend/script.js` and `backend/WildfireApi/Program.cs`/launch settings. If you serve the frontend from another origin, add that exact origin to the `WithOrigins(...)` CORS policy; `localhost` and `127.0.0.1` are different origins.

## Persistence and data safety

The controller resolves the project root from `AppContext.BaseDirectory` and writes to:

```text
backend/WildfireApi/saved_fires.json
```

Each save reads the existing array, appends the incoming records, and writes the complete indented JSON array back to disk. Existing records are therefore retained across requests. The file is local runtime state and should be backed up or excluded from source control according to the deployment policy.

## Troubleshooting

- **CORS error:** serve the frontend at exactly `http://127.0.0.1:5500`, or update the backend policy for the actual origin.
- **Connection refused:** confirm the API is running on port `5000`, because that is the URL hard-coded in `script.js`.
- **Swagger is unavailable:** use the HTTP URL shown by the active profile and ensure the application is running in the Development environment.
- **No map data:** check browser connectivity to the ArcGIS CDN and sample FeatureServer, then inspect the browser console for layer-load errors.
- **Saved data is not where expected:** check `backend/WildfireApi/saved_fires.json`, not the compiled `bin` directory.

## Production considerations

Before production deployment, replace the sample service and local JSON file with managed data and storage, move API URLs to configuration, validate and limit request payloads, add structured logging, protect the write endpoint, and make persistence concurrency-safe. Also use a restrictive, environment-specific CORS policy and serve the frontend and API over HTTPS.

## License and attribution

The application uses Esri's ArcGIS Maps SDK for JavaScript and sample Wildfire FeatureServer. Review the applicable Esri terms, attribution requirements, and service availability before redistribution or production use.
