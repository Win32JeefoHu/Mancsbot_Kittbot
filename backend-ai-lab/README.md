# KITT AI Strategy Lab backend module

60 másodperces helyi optimalizáló. A modul nem írja át automatikusan a forráskódot: verziózott konfigurációt javasol, staging után kézi mentéssel aktiválható és rollbackelhető.

## API
- GET /api/ai-lab/status
- POST /api/ai-lab/analyze
- POST /api/ai-lab/proposals/:id/stage
- POST /api/ai-lab/proposals/:id/reject
- POST /api/ai-lab/trial/save
- POST /api/ai-lab/trial/discard
- POST /api/ai-lab/versions/:id/rollback

A server.js-be: app.use('/api/ai-lab', aiLabRouter); majd aiLab.start().
