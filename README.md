# Gestion de Bibliotheque

Etat actuel du depot : partie de Sirine centree sur `books-service`.

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

`user-loans-service` est un microservice REST en Node.js pour la gestion des emprunts.

Fonctionnalites :

- creer un emprunt (avec verification du livre dans `books-service`)
- lister tous les emprunts
- lister les emprunts d'un utilisateur
- retourner un livre
- supprimer un emprunt
- mise a jour automatique de la disponibilite du livre dans `books-service`

Routes principales :

- `GET /loans`
- `GET /loans/user/:userId`
- `POST /loans`
- `PUT /loans/:id/return`
- `DELETE /loans/:id`
- `GET /health`

### Kubernetes

Le dossier `user-loans-service/k8s` contient :

- un `Deployment` pour le service Node.js
- un `StatefulSet` PostgreSQL avec PVC
- un `Service` ClusterIP
- un `Ingress` nginx (expose `/loans` sur `http://127.0.0.1`)
- des `Secrets` pour les credentials PostgreSQL
- des regles `RBAC` (ServiceAccount, Role, RoleBinding)

Appliquer :

```bash
kubectl apply -f user-loans-service/k8s/
```

Verifier :

```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

### Communication inter-services

Le service appelle `books-service` pour :

- verifier qu'un livre existe avant de creer un emprunt (`GET /books/:id`)
- marquer le livre comme emprunte (`PATCH /books/:id/borrow`)
- marquer le livre comme disponible au retour (`PATCH /books/:id/return`)

Variable d'environnement :

```
BOOK_CATALOG_URL=http://books-service.library-app.svc.cluster.local:3001
```

### Docker Hub

```bash
chaimaaaa/user-loans-service:latest
```

### Test de l'API

```bash
# Creer un emprunt
curl -X POST http://127.0.0.1/loans \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","book_id":"book-1"}'

# Lister les emprunts
curl http://127.0.0.1/loans

# Retourner un livre
curl -X PUT http://127.0.0.1/loans/1/return
```

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
