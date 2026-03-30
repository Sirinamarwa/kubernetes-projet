# Systeme de Gestion de Bibliotheque — Microservices

Projet realise en binome par Sirine et Chaimaa.

L'application repose sur deux microservices Node.js/Express, chacun connecte a PostgreSQL, conteneurises avec Docker et deployables sous Kubernetes. Une interface React/Vite permet de manipuler le catalogue et les emprunts dans une seule demo.

## Vue d'ensemble

| Element | Books Service | Loans Service |
|---|---|---|
| Responsable | Sirine | Chaimaa |
| Role | gestion du catalogue | gestion des emprunts |
| Langage | Node.js / Express | Node.js / Express |
| Base de donnees | PostgreSQL | PostgreSQL |
| Port interne | `3001` | `3000` |
| Port local Docker Compose | `3001` | `3002` |
| Image Docker Hub | `sirinamarwa/books-service:latest` | `chaimaaaa/user-loans-service:latest` |

## Architecture

- `services/books-service/` : catalogue de livres
- `services/loans-service/` : creation, suivi et retour des emprunts
- `frontend/` : interface React/Vite
- `k8s/base/` : ressources Kubernetes pour `books-service` et son PostgreSQL
- `k8s/loans/` : ressources Kubernetes pour `loans-service` et son PostgreSQL

## Service A — Books Service

`books-service` gere les livres du catalogue.

Fonctionnalites principales :

- lister tous les livres
- recuperer un livre par identifiant
- creer un livre
- modifier un livre
- supprimer un livre
- filtrer les livres disponibles
- rechercher par titre ou auteur
- marquer un livre comme emprunte
- marquer un livre comme retourne

Routes principales :

- `GET /health`
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

Schema PostgreSQL :

```sql
CREATE TABLE books (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  available BOOLEAN DEFAULT true
);
```

Le seed actuel charge un catalogue de demonstration avec plusieurs ouvrages techniques.

## Service B — Loans Service

`user-loans-service` gere les emprunts.

Fonctionnalites principales :

- creer un emprunt
- lister tous les emprunts
- lister les emprunts d'un utilisateur
- enregistrer le retour d'un livre
- supprimer un emprunt
- verifier l'etat du service

Routes principales :

- `GET /health`
- `GET /loans`
- `GET /loans/user/:userId`
- `POST /loans`
- `PUT /loans/:id/return`
- `DELETE /loans/:id`

Schema PostgreSQL :

```sql
CREATE TABLE loans (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  book_id VARCHAR(100) NOT NULL,
  loan_date TIMESTAMP DEFAULT NOW(),
  return_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);
```

### Communication inter-services

Lorsqu'un emprunt est cree, `loans-service` :

1. verifie que le livre existe dans `books-service`
2. demande a `books-service` de marquer le livre comme emprunte
3. enregistre ensuite l'emprunt en base

Lors d'un retour, `loans-service` :

1. marque l'emprunt comme retourne
2. remet le livre en disponibilite dans `books-service`

Variable d'environnement utilisee en Kubernetes :

```bash
BOOK_CATALOG_URL=http://books-service.library-app.svc.cluster.local:3001
```

## Frontend

Le frontend React/Vite se trouve dans `frontend/`.

Fonctionnalites UI actuelles :

- catalogue visuel avec recherche et filtres
- ajout de livre via une modale
- fiche de livre selectionne
- vue `Mes Emprunts`
- sous-onglet `Emprunter un livre`
- sous-onglet `Historique des emprunts`
- parcours guide de creation d'emprunt
- recapitulatif du pret en cours de creation
- detail d'un emprunt avec timeline et action de retour

Variables utilisees par le frontend :

```bash
VITE_BOOKS_API_URL=http://localhost:3001
VITE_LOANS_API_URL=http://localhost:3002
```

## Lancement local complet

Le plus simple pour lancer toute l'application est :

```bash
docker compose up --build
```

Services exposes localement :

- `books-service` : `http://localhost:3001`
- `loans-service` : `http://localhost:3002`
- `frontend` : `http://localhost:5173`
- `postgres` : `localhost:5432`

Verification rapide :

```bash
curl http://localhost:3001/health
curl http://localhost:3001/books
curl http://localhost:3002/health
curl http://localhost:3002/loans
```

Puis ouvrir :

```bash
http://localhost:5173
```

## Docker

### Books Service

```bash
docker build -t books-service-local ./services/books-service
docker tag books-service-local sirinamarwa/books-service:latest
docker push sirinamarwa/books-service:latest
```

### Loans Service

```bash
docker build -t chaimaaaa/user-loans-service:latest ./services/loans-service
docker push chaimaaaa/user-loans-service:latest
```

## Kubernetes

### Books Service

Le dossier `k8s/base/` contient :

- `namespace.yaml`
- `configmap.yaml`
- `secret.yaml`
- `postgres.yaml`
- `books-service.yaml`
- `ingress.yaml`
- `kustomization.yaml`

Appliquer :

```bash
kubectl apply -k k8s/base
```

Verifier :

```bash
kubectl get pods -n library-app
kubectl get svc -n library-app
kubectl get pvc -n library-app
kubectl get ingress -n library-app
```

### Loans Service

Le dossier `k8s/loans/` contient :

- `deployment.yaml`
- `statefulset-postgres.yaml`
- `pvc.yaml`
- `service.yaml`
- `ingress.yaml`
- `secret.yaml`
- `rbac.yaml`

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
```

## Exemples de tests API

### Catalogue

```bash
curl http://localhost:3001/books
curl http://localhost:3001/books/book-1
curl "http://localhost:3001/books?available=true"
curl "http://localhost:3001/books?search=clean"
curl -X PATCH http://localhost:3001/books/book-1/borrow
curl -X PATCH http://localhost:3001/books/book-1/return
```

### Emprunts

```bash
curl -X POST http://localhost:3002/loans \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u1","book_id":"book-1"}'

curl http://localhost:3002/loans
curl http://localhost:3002/loans/user/u1
curl -X PUT http://localhost:3002/loans/1/return
```

Reponses metier attendues :

- `201` : emprunt cree avec succes
- `404` : livre introuvable
- `409` : livre deja emprunte / indisponible
- `500` : erreur interne

## Repartition finale

| Responsabilite | Sirine | Chaimaa |
|---|---|---|
| Books Service | ✅ | |
| Loans Service | | ✅ |
| PostgreSQL | ✅ | ✅ |
| Docker / Docker Hub | ✅ | ✅ |
| Kubernetes | ✅ | ✅ |
| Ingress | ✅ | ✅ |
| RBAC / Secrets loans | | ✅ |
| Communication inter-services | | ✅ |
| Frontend React final | ✅ | |
