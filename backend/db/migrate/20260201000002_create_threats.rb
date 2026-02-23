class CreateThreats < ActiveRecord::Migration[7.2]
  def change
    create_table :threats, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :hunt_cycle_id, limit: 36
      t.string :title, limit: 255, null: false
      t.text :description, null: false
      t.integer :confidence_score, null: false, default: 0
      t.string :severity, limit: 20, null: false, default: "medium"
      t.string :status, limit: 30, null: false, default: "new"
      t.string :attack_phase, limit: 30
      t.json :affected_assets
      t.json :agent_reasoning
      t.json :esql_queries_used
      t.json :mitre_techniques
      t.json :auto_actions_taken
      t.json :timeline_events
      t.string :elastic_dashboard_url, limit: 512
      t.datetime :detected_at, null: false
      t.datetime :resolved_at

      t.timestamps null: false
    end

    add_index :threats, :status
    add_index :threats, :severity
    add_index :threats, :confidence_score
    add_index :threats, :detected_at
    add_index :threats, :hunt_cycle_id
    add_index :threats, :attack_phase

    add_foreign_key :threats, :hunt_cycles,
      column: :hunt_cycle_id,
      on_delete: :nullify
  end
end

