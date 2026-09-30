require('minitest')

# Reports test failures as GitHub Actions annotations. Unlike problem matchers,
# workflow commands support multiline messages (newlines are encoded as `%0A`).
#
# See https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
module GitHubAnnotations
  class Reporter < Minitest::AbstractReporter
    def initialize(io)
      super()
      @io = io
      @annotations = []
    end

    def record(result)
      return if result.passed? || result.skipped?

      failure = result.failure
      file, line = parse_location(failure.location)
      title = "#{result.class_name}##{result.name}"
      @annotations << "::error file=#{escape_property(file)},line=#{line}," \
                      "title=#{escape_property(title)}::#{escape_data(failure.message.rstrip)}"
    end

    # Workflow commands must start on a new line, so we cannot print them
    # while progress is being reported.
    def report
      @io.puts(@annotations) unless @annotations.empty?
    end

    private

    def escape_data(value)
      value.to_s.gsub('%', '%25').gsub("\r", '%0D').gsub("\n", '%0A')
    end

    def escape_property(value)
      escape_data(value).gsub(':', '%3A').gsub(',', '%2C')
    end

    # The runner makes absolute paths under `GITHUB_WORKSPACE` relative to it.
    def parse_location(location)
      file, line = location.match(/\A(.*):(\d+)\z/)&.captures || [location, 1]
      [File.expand_path(file), line]
    end
  end

  def self.minitest_plugin_init(options)
    return unless ENV['GITHUB_ACTIONS'] == 'true'

    Minitest.reporter << Reporter.new(options[:io])
  end
end

Minitest.register_plugin(GitHubAnnotations)
