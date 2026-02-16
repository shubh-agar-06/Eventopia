-- Run this once to add team support to event registrations.
-- Team events: students create or join a team by team name; leader is who created the team.

ALTER TABLE event_registration
  ADD COLUMN team_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN is_leader TINYINT(1) DEFAULT 0;
