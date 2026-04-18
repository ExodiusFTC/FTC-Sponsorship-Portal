DROP POLICY IF EXISTS "submissions_update_coach" ON submissions;

CREATE POLICY "submissions_update_coach" ON submissions FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
        AND status IN ('draft', 'declined', 'changes_requested')
    )
    WITH CHECK (
        status IN ('draft', 'pending')
    );
