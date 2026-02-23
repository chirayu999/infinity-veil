class CreateReviewQueueItems < ActiveRecord::Migration[7.2]
  def change
    create_table :review_queue_items, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :threat_id, limit: 36, null: false
      t.string :marked_by, limit: 255, null: false
      t.text :reason, null: false
      t.string :review_status, limit: 20, null: false, default: "pending"
      t.string :reviewed_by, limit: 255
      t.text :review_notes
      t.datetime :reviewed_at

      t.timestamps null: false
    end

    add_index :review_queue_items, :review_status
    add_index :review_queue_items, :threat_id

    add_foreign_key :review_queue_items, :threats,
      column: :threat_id,
      on_delete: :cascade
  end
end

