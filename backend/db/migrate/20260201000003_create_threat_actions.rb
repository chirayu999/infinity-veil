class CreateThreatActions < ActiveRecord::Migration[7.2]
  def change
    create_table :threat_actions, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :threat_id, limit: 36, null: false
      t.string :action_type, limit: 30, null: false
      t.string :performed_by, limit: 255, null: false
      t.text :notes

      t.timestamps null: false
    end

    add_index :threat_actions, :threat_id
    add_index :threat_actions, :action_type
    add_index :threat_actions, :created_at

    add_foreign_key :threat_actions, :threats,
      column: :threat_id,
      on_delete: :cascade
  end
end

