class AddCreatedThreatIdToChatMessages < ActiveRecord::Migration[7.2]
  def change
    add_column :chat_messages, :created_threat_id, :string, limit: 36
    add_index :chat_messages, :created_threat_id
  end
end
