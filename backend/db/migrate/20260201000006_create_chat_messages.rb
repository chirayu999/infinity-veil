class CreateChatMessages < ActiveRecord::Migration[7.2]
  def change
    create_table :chat_messages, id: false do |t|
      t.string :id, limit: 36, null: false, primary_key: true
      t.string :role, limit: 10, null: false
      t.text :content, null: false
      t.string :agent_name, limit: 50
      t.json :metadata

      t.timestamps null: false
    end

    add_index :chat_messages, :role
    add_index :chat_messages, :created_at
  end
end

