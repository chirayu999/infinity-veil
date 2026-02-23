# frozen_string_literal: true

namespace :chat do
  desc "Fix chat_messages rows whose content was stored as a Ruby hash string " \
       "(e.g. {\"content\"=>\"\\\"actual text\\\"\"}) due to a params extraction bug. " \
       "Safe to run multiple times – rows that are already clean are skipped."
  task fix_corrupted_content: :environment do
    # Pattern produced by calling params.require(:message).to_s, which gives something like:
    #   {"content"=>"\"actual message text\""}
    # We match both the ActionController::Parameters inspect format and a plain Ruby hash inspect.
    corrupted = ChatMessage.all.select do |m|
      m.content.start_with?('{"content"=>')
    end

    if corrupted.empty?
      puts "No corrupted chat messages found. Nothing to do."
      next
    end

    puts "Found #{corrupted.size} corrupted message(s). Repairing..."

    repaired = 0
    corrupted.each do |msg|
      # Extract the raw value after `"content"=>`
      # Handles both:
      #   {"content"=>"actual text"}
      #   {"content"=>"\"actual text\""}  (value was also JSON-stringified)
      raw_value = msg.content
                     .sub(/\A\{"content"=>/, "")   # strip leading {"content"=>
                     .sub(/\}\z/, "")               # strip trailing }

      # raw_value is now a Ruby string literal, e.g.: "\"actual text\""
      # Evaluate it safely as a Ruby string literal using JSON parse (handles escaped quotes).
      # First strip the outer Ruby double-quotes if present.
      actual_text =
        if raw_value.start_with?('"') && raw_value.end_with?('"')
          # Strip outer quotes and unescape inner \"
          inner = raw_value[1..-2].gsub('\\"', '"')
          # If the inner value is itself JSON-quoted (double-stringified), strip again
          if inner.start_with?('"') && inner.end_with?('"')
            inner[1..-2].gsub('\\"', '"')
          else
            inner
          end
        else
          raw_value
        end

      if actual_text.blank?
        puts "  [SKIP] Message #{msg.id} – could not extract content from: #{msg.content.inspect}"
        next
      end

      msg.update_column(:content, actual_text)
      puts "  [FIXED] #{msg.id}: #{actual_text.truncate(80)}"
      repaired += 1
    end

    puts "\nDone. #{repaired}/#{corrupted.size} message(s) repaired."
  end
end

