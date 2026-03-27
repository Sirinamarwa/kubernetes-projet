# Gestion de Bibliotheque

Etat actuel du depot : partie de Sirine centree sur `books-service`.

## Service A

`books-service` est un microservice REST en Node.js pour la gestion des livres.

Fonctionnalites :

- ajouter un livre
- lister les livres
- recuperer un livre par identifiant
- modifier un livre
- supprimer un livre

Routes principales :

- `GET /books`
- `GET /books/:id`
- `POST /books`
- `PUT /books/:id`
- `DELETE /books/:id`

## Local

Le service depend maintenant de PostgreSQL.
Pour un lancement complet et simple, utilise Docker Compose :

```bash
docker compose up --build
```

Verifier :

```bash
curl http://localhost:3001/books
```

Le service utilise maintenant PostgreSQL. Pour un lancement local complet, il est donc recommande d'utiliser Docker Compose.

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
```

## Repartition actuelle

- Sirine : `books-service`, PostgreSQL, Docker, Docker Hub, Kubernetes, Ingress
- Chaimaa : `loans-service`, PostgreSQL, communication entre services
- Integration complete de l'application : sera faite ensuite
