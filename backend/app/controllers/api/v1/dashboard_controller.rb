# frozen_string_literal: true

module Api
  module V1
    class DashboardController < BaseController
      # GET /api/v1/dashboard/stats
      def stats
        today_start = Time.current.beginning_of_day
        week_start  = Time.current.beginning_of_week

        threats_today   = Threat.where(detected_at: today_start..)
        threats_week    = Threat.where(detected_at: week_start..)
        active_threats  = Threat.active

        hunts_today     = HuntCycle.where(started_at: today_start..)
        completed_hunts = hunts_today.completed
        failed_hunts    = hunts_today.failed

        avg_duration = completed_hunts.where.not(completed_at: nil).average(
          "TIMESTAMPDIFF(SECOND, started_at, completed_at)"
        ).to_f.round

        total_reviewed = Threat.where(
          status: %w[false_positive_confirmed false_positive_pending],
          detected_at: 30.days.ago..
        ).count
        total_fp = Threat.where(status: "false_positive_confirmed", detected_at: 30.days.ago..).count
        fp_rate = total_reviewed > 0 ? (total_fp.to_f / total_reviewed).round(2) : 0.0

        all_active = active_threats.to_a
        avg_confidence = all_active.any? ? (all_active.sum(&:confidence_score) / all_active.size).round : 0

        render json: {
          stats: {
            threats_today:              threats_today.count,
            threats_this_week:          threats_week.count,
            critical_count:             threats_week.where(severity: "critical").count,
            high_count:                 threats_week.where(severity: "high").count,
            medium_count:               threats_week.where(severity: "medium").count,
            low_count:                  threats_week.where(severity: "low").count,
            avg_confidence:             avg_confidence,
            pending_review_count:       ReviewQueueItem.pending_review.count,
            hunts_completed_today:      completed_hunts.count,
            hunts_failed_today:         failed_hunts.count,
            avg_hunt_duration_seconds:  avg_duration,
            false_positive_rate:        fp_rate,
            threats_resolved_today:     threats_today.where(status: "resolved").count,
            active_threats:             active_threats.count
          }
        }
      end

      # GET /api/v1/dashboard/activity_feed
      def activity_feed
        page = page_param
        per  = per_page_param(default: 20)

        activities = build_activity_feed
        total      = activities.size
        paginated  = activities[(page - 1) * per, per] || []

        render json: {
          activities: paginated,
          meta:       { current_page: page, per_page: per, total_count: total, total_pages: (total.to_f / per).ceil }
        }
      end

      private

      def build_activity_feed
        items = []

        # Recent threats detected
        Threat.recent.limit(20).each do |t|
          items << {
            id:               "threat_#{t.id}",
            event_type:       "threat_detected",
            timestamp:        t.detected_at.iso8601,
            title:            t.title,
            detail:           "#{t.severity.upcase} | #{t.confidence_score}% confidence",
            severity:         t.severity,
            confidence_score: t.confidence_score,
            threat_id:        t.id
          }
        end

        # Recent hunt completions
        HuntCycle.completed.recent.limit(10).each do |h|
          items << {
            id:           "hunt_#{h.id}",
            event_type:   "hunt_completed",
            timestamp:    h.completed_at.iso8601,
            title:        "#{h.triggered_by.capitalize} hunt completed",
            detail:       "#{h.threats_found_count} threat(s) found",
            severity:     nil,
            hunt_id:      h.id
          }
        end

        # Recent threat actions (human actions only)
        ThreatAction.by_humans.recent.limit(15).each do |a|
          items << {
            id:           "action_#{a.id}",
            event_type:   "action_taken",
            timestamp:    a.created_at.iso8601,
            title:        "#{a.action_type.humanize} by #{a.performed_by}",
            detail:       a.notes&.truncate(100),
            severity:     nil,
            performed_by: a.performed_by,
            threat_id:    a.threat_id
          }
        end

        # Pending review items
        ReviewQueueItem.pending_review.recent.limit(5).each do |r|
          items << {
            id:         "review_#{r.id}",
            event_type: "review_pending",
            timestamp:  r.created_at.iso8601,
            title:      "False positive claim requires review",
            detail:     "Marked by #{r.marked_by}",
            severity:   nil,
            threat_id:  r.threat_id,
            marked_by:  r.marked_by
          }
        end

        # Sort all activities by timestamp descending
        items.sort_by { |a| a[:timestamp] }.reverse
      end
    end
  end
end

