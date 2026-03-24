# Gestion de Bibliotheque

Etat actuel du depot : partie de Sirine centree sur `books-service`.

## Service A

`books-service` est un microservice REST en Node.js pour la gestion des livres.

Fonctionnalites :

- ajouter un livre
- lister les livres
- supprimer un livre

Routes principales :

- `GET /books`
- `GET /books/:id`
- `POST /books`
- `DELETE /books/:id`

## Local

Lancer le service :

```bash
cd services/books-service
npm install
npm start
```

Verifier :

```bash
curl http://localhost:3001/books
```

## Docker

Construire l'image :

```bash
docker build -t books-service-local ./services/books-service
```

Lancer le conteneur :

```bash
docker run --rm -p 3001:3001 books-service-local
```

## Docker Hub

Image utilisee :

```bash
sirinamarwa/books-service:latest
```

Publier :

```bash
docker tag books-service-local sirinamarwa/books-service:latest
docker push sirinamarwa/books-service:latest
```

## Kubernetes

Le dossier `k8s/base` est actuellement configure uniquement pour `books-service`.

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
```

## Repartition actuelle

- Sirine : `books-service`, Docker, Docker Hub, Kubernetes, Ingress
- Chaimaa : `loans-service`, PostgreSQL, communication entre services
- Integration complete de l'application : sera faite ensuite
