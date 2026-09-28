# Deployment order

1. Create Supabase project and run `backend/supabase/schema.sql`.
2. Create the first Store row and Owner Auth user.
3. Add `store_members` membership.
4. Deploy `backend` as a Vercel project.
5. Add backend environment variables in Vercel.
6. Test `/api/health`.
7. Test authenticated Owner endpoints.
8. Then update/deploy Customer and Owner frontends with the backend URL.

Do not put service-role or Gemini secrets into frontend projects.
