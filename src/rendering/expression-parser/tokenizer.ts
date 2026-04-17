import { TokenType, type Token } from "./types.js";

/**
 * Implements the responsibility of converting expression strings into lexical tokens.
 * This tokenizer handles the complete expression language including identifiers,
 * literals, operators, and punctuation. Follows SRP by focusing solely on tokenization.
 */
export class Tokenizer {
  private input: string;
  private position: number = 0;

  /**
   * Initializes a new instance of Tokenizer.
   *
   * @param input - The expression string to tokenize
   * @throws Error if input is null or undefined
   */
  constructor(input: string) {
    if (!input) throw new Error("Input expression is required");
    this.input = input.trim();
  }

  /**
   * Returns the current character without advancing the position.
   * @returns The current character or empty string if at end
   * @private
   */
  private peek(): string {
    return this.input[this.position] || "";
  }

  /**
   * Returns the current character and advances the position.
   * @returns The current character or empty string if at end
   * @private
   */
  private advance(): string {
    return this.input[this.position++] || "";
  }

  /**
   * Skips over whitespace characters in the input.
   * @private
   */
  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }

  /**
   * Reads an identifier token from the current position.
   * @returns The identifier string
   * @private
   */
  private readIdentifier(): string {
    let result = "";
    while (/[a-zA-Z0-9_$]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  /**
   * Reads a number token from the current position.
   * @returns The number string (including decimal point)
   * @private
   */
  private readNumber(): string {
    let result = "";
    while (/[0-9.]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  /**
   * Reads a string literal from the current position.
   * @param quote - The quote character (' or ") that started the string
   * @returns The string content (without quotes)
   * @private
   */
  private readString(quote: string): string {
    this.advance(); // Skip opening quote
    let result = "";

    let current = this.peek();
    while (current !== "") {
      if (current === quote) {
        this.advance(); // Skip closing quote
        return result;
      }

      if (current === "\\") {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case "n":
            result += "\n";
            break;
          case "t":
            result += "\t";
            break;
          case "r":
            result += "\r";
            break;
          default:
            result += escaped;
        }
      } else {
        result += this.advance();
      }

      current = this.peek();
    }

    throw new Error(`Unterminated string at position ${this.position}`);
  }

  /**
   * Converts the input expression string into an array of tokens.
   * Processes the entire input, recognizing all supported token types.
   *
   * @returns Array of tokens representing the lexical elements
   * @throws Error if unexpected characters are encountered
   *
   * @example
   * ```typescript
   * const tokenizer = new Tokenizer('x + 1');
   * const tokens = tokenizer.tokenize();
   * ```
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const start = this.position;
      const char = this.peek();

      // Identifiers
      if (/[a-zA-Z_$]/.test(char)) {
        const identifier = this.readIdentifier();
        tokens.push({
          type: TokenType.IDENTIFIER,
          value: identifier,
          position: start,
        });
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        const number = this.readNumber();
        tokens.push({ type: TokenType.NUMBER, value: number, position: start });
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        const string = this.readString(char);
        tokens.push({ type: TokenType.STRING, value: string, position: start });
        continue;
      }

      // Three-character operators (check first before two-char)
      const threeChar = this.input.substring(this.position, this.position + 3);
      if (threeChar === "===") {
        this.advance();
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.EQUAL, value: "===", position: start });
        continue;
      }
      if (threeChar === "!==") {
        this.advance();
        this.advance();
        this.advance();
        tokens.push({
          type: TokenType.NOT_EQUAL,
          value: "!==",
          position: start,
        });
        continue;
      }

      // Two-character operators
      const twoChar = this.input.substring(this.position, this.position + 2);
      if (twoChar === "?.") {
        this.advance();
        this.advance();
        tokens.push({
          type: TokenType.OPTIONAL_CHAIN,
          value: "?.",
          position: start,
        });
        continue;
      }
      if (twoChar === ">=") {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.GTE, value: ">=", position: start });
        continue;
      }
      if (twoChar === "<=") {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.LTE, value: "<=", position: start });
        continue;
      }
      if (twoChar === "&&") {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.AND, value: "&&", position: start });
        continue;
      }
      if (twoChar === "||") {
        this.advance();
        this.advance();
        tokens.push({ type: TokenType.OR, value: "||", position: start });
        continue;
      }

      // Single-character tokens
      switch (char) {
        case ".":
          this.advance();
          tokens.push({ type: TokenType.DOT, value: ".", position: start });
          break;
        case "(":
          this.advance();
          tokens.push({ type: TokenType.LPAREN, value: "(", position: start });
          break;
        case ")":
          this.advance();
          tokens.push({ type: TokenType.RPAREN, value: ")", position: start });
          break;
        case ",":
          this.advance();
          tokens.push({ type: TokenType.COMMA, value: ",", position: start });
          break;
        case "+":
          this.advance();
          tokens.push({ type: TokenType.PLUS, value: "+", position: start });
          break;
        case "-":
          this.advance();
          tokens.push({ type: TokenType.MINUS, value: "-", position: start });
          break;
        case "*":
          this.advance();
          tokens.push({
            type: TokenType.MULTIPLY,
            value: "*",
            position: start,
          });
          break;
        case "/":
          this.advance();
          tokens.push({ type: TokenType.DIVIDE, value: "/", position: start });
          break;
        case "%":
          this.advance();
          tokens.push({ type: TokenType.MODULO, value: "%", position: start });
          break;
        case "!":
          this.advance();
          tokens.push({ type: TokenType.NOT, value: "!", position: start });
          break;
        case "?":
          this.advance();
          tokens.push({
            type: TokenType.QUESTION,
            value: "?",
            position: start,
          });
          break;
        case ":":
          this.advance();
          tokens.push({ type: TokenType.COLON, value: ":", position: start });
          break;
        case ">":
          this.advance();
          tokens.push({ type: TokenType.GT, value: ">", position: start });
          break;
        case "<":
          this.advance();
          tokens.push({ type: TokenType.LT, value: "<", position: start });
          break;
        default:
          throw new Error(
            `Unexpected character "${char}" at position ${this.position}`,
          );
      }
    }

    tokens.push({ type: TokenType.EOF, value: "", position: this.position });
    return tokens;
  }
}
