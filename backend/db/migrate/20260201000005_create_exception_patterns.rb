class CreateExceptionPatterns < ActiveRecord::Migration[7.2]
  def change
    create_table :exception_patterns, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :source_threat_id, limit: 36
      t.string :pattern_type, limit: 100, null: false
      t.text :description, null: false
      t.text :esql_exclusion
      t.boolean :active, null: false, default: true

      t.timestamps null: false
    end

    add_index :exception_patterns, :active
    add_index :exception_patterns, :pattern_type

    add_foreign_key :exception_patterns, :threats,
      column: :source_threat_id,
      on_delete: :nullify
  end
end

