# Running BTB-CG-System with Portainer

This guide explains how to deploy the BTB-CG-System using Portainer, fetching the source code directly from a GitHub repository.

## Prerequisites

- Portainer instance running and accessible.
- Docker and Docker Compose installed on the host.

## Deployment Steps

1. **Log in to Portainer.**
2. **Navigate to "Stacks"** in the sidebar.
3. **Click "Add stack".**
4. **Name your stack** (e.g., `btb-cg-system`).
5. **Select "Repository"** as the build method.
6. **Enter the Repository URL:** `https://github.com/sdorpl/BTB-CG-System.git`
7. **Specify the "Compose path":** `docker-compose.yml`.
8. **Under "Environment variables"**, you can optionally set `PORT` if you want the internal server to run on a different port (default is 3000).
9. **Click "Deploy the stack".**

## Post-Deployment

- The application will automatically build the Docker image and start the container.
- On the first run, the SQLite database will be automatically initialized and populated from `db.json`.
- You can access the Control Panel at `http://<your-server-ip>:3000/`.
- The output page is available at `http://<your-server-ip>:3000/output.html`.

## Data Persistence

The `docker-compose.yml` is configured to persist data in a `./data` directory relative to where the stack is deployed. This directory will contain your `database.sqlite` file.
