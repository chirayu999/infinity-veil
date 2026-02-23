class CreateHuntCycles < ActiveRecord::Migration[7.2]
  def change
    create_table :hunt_cycles, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :status, limit: 20, null: false, default: "queued"
      t.string :triggered_by, limit: 20, null: false, default: "scheduled"
      t.integer :threats_found_count, null: false, default: 0
      t.json :agent_summary
      t.datetime :started_at
      t.datetime :completed_at

      t.timestamps null: false
    end

    add_index :hunt_cycles, :status
    add_index :hunt_cycles, :started_at
  end
end

