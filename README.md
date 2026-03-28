# Systeme de Gestion de Bibliotheque — Microservices

Application distribuee de gestion de bibliotheque developpee en binome (Sirine & Chaimaa).

Architecture basee sur deux microservices independants communicant via REST, conteneurises avec Docker et orchestres sous Kubernetes (Minikube).

| | Service A — Books | Service B — Loans |
|--|--|--|
| Auteure | Sirine | Chaimaa |
| Langage | Node.js | Node.js |
| Base de donnees | PostgreSQL | PostgreSQL |
| Port interne | 3001 | 3000 |
| Namespace K8s | `library-app` | `default` |

## Service A

`books-service` est un microservice REST en Node.js pour la gestion des livres.

Fonctionnalites :

- ajouter un livre
- lister les livres
- recuperer un livre par identifiant
- modifier un livre
- filtrer les livres disponibles
- rechercher un livre par titre ou auteur
- emprunter un livre
- enregistrer le retour d'un livre
- supprimer un livre

Routes principales :

- `GET /books`
- `GET /books/:id`
- `POST /books`
- `PUT /books/:id`
- `PATCH /books/:id/availability`
- `PATCH /books/:id/borrow`
- `PATCH /books/:id/return`
- `DELETE /books/:id`

Le service retourne aussi un champ metier `status` :

- `AVAILABLE`
- `BORROWED`

## Local

Le service depend maintenant de PostgreSQL.
Pour un lancement complet et simple, utilise Docker Compose :

```bash
docker compose up --build
```

Verifier :

```bash
curl http://localhost:3001/books
curl http://localhost:3001/books/book-1
```

Le service utilise maintenant PostgreSQL. Pour un lancement local complet, il est donc recommande d'utiliser Docker Compose.

Exemples de tests metier :

```bash
curl "http://localhost:3001/books?available=true"
curl "http://localhost:3001/books?search=clean"
curl -X PATCH http://localhost:3001/books/book-1/borrow
curl -X PATCH http://localhost:3001/books/book-1/return
```

## Docker

Construire l'image :

```bash
docker build -t books-service-local ./services/books-service
```

Mettre a jour Docker Hub :

```bash
docker tag books-service-local sirinamarwa/books-service:latest
docker push sirinamarwa/books-service:latest
```

## Docker Hub

Image utilisee :

```bash
sirinamarwa/books-service:latest
```

Publier :

## Kubernetes

Le dossier `k8s/base` est actuellement configure uniquement pour `books-service`.

Il inclut maintenant :

- un `StatefulSet` PostgreSQL
- une table `books`
- le service `books-service`
- un `Ingress`

Appliquer :

```bash
kubectl apply -k k8s/base
```

Verifier :

```bash
kubectl get deployments -n library-app
kubectl get pods -n library-app
kubectl get svc -n library-app
kubectl get ingress -n library-app
kubectl get pvc -n library-app
```

Pour tester le service deploye :

```bash
kubectl port-forward svc/books-service 3010:3001 -n library-app
```

Puis dans un autre terminal :

```bash
curl http://localhost:3010/books
curl http://localhost:3010/books/book-1
curl -X PATCH http://localhost:3010/books/book-1/borrow
```

En cas de livre deja emprunte, l'API renvoie :

- code HTTP `409`
- `code: BOOK_UNAVAILABLE`
- message `Livre deja prete ou non disponible.`

## Frontend

Un frontend React/Vite est maintenant disponible dans `frontend/`.

Fonctionnalites UI actuelles :

- affichage du catalogue
- badge `Disponible` / `Deja prete`
- ajout d'un livre
- bouton `Emprunter`
- bouton `Retourner`
- zone reservee pour le module `loans-service` de Chaimaa

Lancement local :

```bash
cd frontend
npm install
npm run dev
```

Puis ouvrir :

```bash
http://localhost:5173
```

Variables optionnelles :

- `VITE_BOOKS_API_URL=http://localhost:3001`
- `VITE_LOANS_API_URL=http://localhost:3002`

## Service B — user-loans-service (Chaimaa)

`user-loans-service` est un microservice REST en Node.js qui gere les emprunts de livres.
Il communique avec `books-service` pour verifier la disponibilite des livres et synchroniser leur statut.

### Fonctionnalites

- creer un emprunt (verifie que le livre existe et est disponible via `books-service`)
- refuser un emprunt si le livre est deja emprunte (HTTP 409)
- lister tous les emprunts
- lister les emprunts d'un utilisateur specifique
- retourner un livre (met a jour la disponibilite dans `books-service`)
- supprimer un emprunt
- health check (`GET /health`)

### Routes

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/loans` | Lister tous les emprunts |
| GET | `/loans/user/:userId` | Emprunts d'un utilisateur |
| POST | `/loans` | Creer un emprunt |
| PUT | `/loans/:id/return` | Retourner un livre |
| DELETE | `/loans/:id` | Supprimer un emprunt |
| GET | `/health` | Health check |

### Communication inter-services

Lors de chaque emprunt, le service appelle `books-service` :

1. `GET /books/:id` — verifie que le livre existe
2. `PATCH /books/:id/borrow` — marque le livre comme emprunte
3. `PATCH /books/:id/return` — marque le livre comme disponible au retour

Variable d'environnement :

```
BOOK_CATALOG_URL=http://books-service.library-app.svc.cluster.local:3001
```

### Securite (RBAC + Secrets)

- `ServiceAccount` dedie : `loans-service-account`
- `Role` et `RoleBinding` pour restreindre les acces au cluster
- Credentials PostgreSQL stockes dans des `Kubernetes Secrets` (jamais en clair dans les YAML)

### Base de donnees

PostgreSQL deploye via `StatefulSet` avec `PersistentVolumeClaim` pour garantir la persistance des donnees apres redemarrage des pods.

Schema de la table `loans` :

```sql
CREATE TABLE loans (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL,
  book_id     VARCHAR(100) NOT NULL,
  loan_date   TIMESTAMP DEFAULT NOW(),
  return_date TIMESTAMP,
  status      VARCHAR(20) DEFAULT 'active'
);
```

### Kubernetes

Le dossier `k8s/loans/` contient :

- `deployment.yaml` — Deployment du service Node.js
- `statefulset-postgres.yaml` — StatefulSet PostgreSQL
- `pvc.yaml` — PersistentVolumeClaim pour la persistance
- `service.yaml` — Service ClusterIP
- `ingress.yaml` — Ingress nginx (expose `/loans` sur `http://127.0.0.1`)
- `secret.yaml` — Secrets PostgreSQL
- `rbac.yaml` — ServiceAccount, Role, RoleBinding

Appliquer :

```bash
kubectl apply -f k8s/loans/
```

Verifier :

```bash
kubectl get pods
kubectl get svc
kubectl get ingress
kubectl get pvc
kubectl get secrets
```

### Docker Hub

```bash
chaimaaaa/user-loans-service:latest
```

Construire et publier :

```bash
docker build -t chaimaaaa/user-loans-service:latest ./services/loans-service
docker push chaimaaaa/user-loans-service:latest
```

### Tests de l'API

Prerequis : `minikube tunnel` actif dans un terminal separe.

```bash
# Creer un emprunt
curl -X POST http://127.0.0.1/loans \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","book_id":"book-1"}'

# Lister tous les emprunts
curl http://127.0.0.1/loans

# Emprunts d'un utilisateur
curl http://127.0.0.1/loans/user/u1

# Retourner un livre
curl -X PUT http://127.0.0.1/loans/1/return

# Supprimer un emprunt
curl -X DELETE http://127.0.0.1/loans/1
```

Reponses metier :

- `201` — emprunt cree avec succes
- `404` — livre introuvable dans le catalogue
- `409` — livre deja emprunte
- `500` — erreur interne

## Repartition finale

| Responsabilite | Sirine | Chaimaa |
|----------------|--------|---------|
| Service Livres (Book-Catalog) | ✅ | |
| Service Emprunts (User-Loans) | | ✅ |
| PostgreSQL + PVC | ✅ | ✅ |
| Docker + Docker Hub | ✅ | ✅ |
| Kubernetes Deployment | ✅ | ✅ |
| Ingress / Routage | ✅ | ✅ |
| RBAC + Secrets | | ✅ |
| Communication inter-services | | ✅ |
| Frontend React | ✅ | |
