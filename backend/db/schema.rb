# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_02_21_103323) do
  create_table "chat_messages", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "role", limit: 10, null: false
    t.text "content", null: false
    t.string "agent_name", limit: 50
    t.json "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "created_threat_id", limit: 36
    t.index ["created_at"], name: "index_chat_messages_on_created_at"
    t.index ["created_threat_id"], name: "index_chat_messages_on_created_threat_id"
    t.index ["role"], name: "index_chat_messages_on_role"
  end

  create_table "exception_patterns", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "source_threat_id", limit: 36
    t.string "pattern_type", limit: 100, null: false
    t.text "description", null: false
    t.text "esql_exclusion"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_exception_patterns_on_active"
    t.index ["pattern_type"], name: "index_exception_patterns_on_pattern_type"
    t.index ["source_threat_id"], name: "fk_rails_d2347e5ffd"
  end

  create_table "hunt_cycles", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "status", limit: 20, default: "queued", null: false
    t.string "triggered_by", limit: 20, default: "scheduled", null: false
    t.integer "threats_found_count", default: 0, null: false
    t.json "agent_summary"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["started_at"], name: "index_hunt_cycles_on_started_at"
    t.index ["status"], name: "index_hunt_cycles_on_status"
  end

  create_table "review_queue_items", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "threat_id", limit: 36, null: false
    t.string "marked_by", null: false
    t.text "reason", null: false
    t.string "review_status", limit: 20, default: "pending", null: false
    t.string "reviewed_by"
    t.text "review_notes"
    t.datetime "reviewed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["review_status"], name: "index_review_queue_items_on_review_status"
    t.index ["threat_id"], name: "index_review_queue_items_on_threat_id"
  end

  create_table "threat_actions", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "threat_id", limit: 36, null: false
    t.string "action_type", limit: 30, null: false
    t.string "performed_by", null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["action_type"], name: "index_threat_actions_on_action_type"
    t.index ["created_at"], name: "index_threat_actions_on_created_at"
    t.index ["threat_id"], name: "index_threat_actions_on_threat_id"
  end

  create_table "threats", id: { type: :string, limit: 36 }, charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "hunt_cycle_id", limit: 36
    t.string "title", null: false
    t.text "description", null: false
    t.integer "confidence_score", default: 0, null: false
    t.string "severity", limit: 20, default: "medium", null: false
    t.string "status", limit: 30, default: "new", null: false
    t.string "attack_phase", limit: 30
    t.json "affected_assets"
    t.json "agent_reasoning"
    t.json "esql_queries_used"
    t.json "mitre_techniques"
    t.json "auto_actions_taken"
    t.json "timeline_events"
    t.string "elastic_dashboard_url", limit: 512
    t.datetime "detected_at", null: false
    t.datetime "resolved_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["attack_phase"], name: "index_threats_on_attack_phase"
    t.index ["confidence_score"], name: "index_threats_on_confidence_score"
    t.index ["detected_at"], name: "index_threats_on_detected_at"
    t.index ["hunt_cycle_id"], name: "index_threats_on_hunt_cycle_id"
    t.index ["severity"], name: "index_threats_on_severity"
    t.index ["status"], name: "index_threats_on_status"
  end

  add_foreign_key "exception_patterns", "threats", column: "source_threat_id", on_delete: :nullify
  add_foreign_key "review_queue_items", "threats", on_delete: :cascade
  add_foreign_key "threat_actions", "threats", on_delete: :cascade
  add_foreign_key "threats", "hunt_cycles", on_delete: :nullify
end
