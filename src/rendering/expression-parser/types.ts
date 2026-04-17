/**
 * Defines the token types used in expression parsing.
 * Each token type represents a distinct lexical element in the expression language.
 */
export enum TokenType {
  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",
  STRING = "STRING",
  DOT = "DOT",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  COMMA = "COMMA",
  PLUS = "PLUS",
  MINUS = "MINUS",
  MULTIPLY = "MULTIPLY",
  DIVIDE = "DIVIDE",
  MODULO = "MODULO",
  NOT = "NOT",
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  GT = "GT",
  LT = "LT",
  GTE = "GTE",
  LTE = "LTE",
  AND = "AND",
  OR = "OR",
  OPTIONAL_CHAIN = "OPTIONAL_CHAIN",
  QUESTION = "QUESTION",
  COLON = "COLON",
  EOF = "EOF",
}

/**
 * Defines the structure of a lexical token produced by the tokenizer.
 * Tokens represent the smallest meaningful units of the expression language.
 *
 * @example
 * ```typescript
 * const token: Token = {
 *   type: TokenType.IDENTIFIER,
 *   value: 'myVar',
 *   position: 0
 * };
 * ```
 */
export interface Token {
  /** The type of token this represents */
  type: TokenType;
  /** The raw string value of the token */
  value: string;
  /** The position in the original expression where this token starts */
  position: number;
}

/**
 * Defines the union type for all possible AST node types.
 * This represents the complete set of nodes that can appear in a parsed expression tree.
 */
export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | MemberExpressionNode
  | CallExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | ConditionalExpressionNode;

/**
 * Defines the structure of a literal AST node.
 * Literal nodes represent primitive values like strings, numbers, or booleans.
 *
 * @example
 * ```typescript
 * const literal: LiteralNode = {
 *   type: 'Literal',
 *   value: 42
 * };
 * ```
 */
export interface LiteralNode {
  /** Discriminant for type narrowing */
  type: "Literal";
  /** The primitive value of this literal */
  value: string | number | boolean | null;
}

/**
 * Defines the structure of an identifier AST node.
 * Identifier nodes represent variable or property names in expressions.
 *
 * @example
 * ```typescript
 * const identifier: IdentifierNode = {
 *   type: 'Identifier',
 *   name: 'myVar'
 * };
 * ```
 */
export interface IdentifierNode {
  /** Discriminant for type narrowing */
  type: "Identifier";
  /** The name of the identifier */
  name: string;
}

/**
 * Defines the structure of a member expression AST node.
 * Member expressions represent property access on objects (e.g., obj.prop).
 *
 * @example
 * ```typescript
 * const member: MemberExpressionNode = {
 *   type: 'MemberExpression',
 *   object: { type: 'Identifier', name: 'obj' },
 *   property: { type: 'Identifier', name: 'prop' },
 *   optional: false
 * };
 * ```
 */
export interface MemberExpressionNode {
  /** Discriminant for type narrowing */
  type: "MemberExpression";
  /** The object being accessed */
  object: ASTNode;
  /** The property being accessed */
  property: IdentifierNode;
  /** Indicates whether this uses the ?. chaining operator */
  optional: boolean;
}

/**
 * Defines the structure of a call expression AST node.
 * Call expressions represent method or function invocations.
 *
 * @example
 * ```typescript
 * const call: CallExpressionNode = {
 *   type: 'CallExpression',
 *   callee: {
 *     type: 'MemberExpression',
 *     object: { type: 'Identifier', name: 'obj' },
 *     property: { type: 'Identifier', name: 'method' },
 *     optional: false
 *   },
 *   arguments: [{ type: 'Literal', value: 'arg' }]
 * };
 * ```
 */
export interface CallExpressionNode {
  /** Discriminant for type narrowing */
  type: "CallExpression";
  /** The expression being called (must be a member expression) */
  callee: MemberExpressionNode;
  /** The arguments passed to the call */
  arguments: ASTNode[];
}

/**
 * Defines the structure of a binary expression AST node.
 * Binary expressions represent operations between two operands.
 *
 * @example
 * ```typescript
 * const binary: BinaryExpressionNode = {
 *   type: 'BinaryExpression',
 *   operator: '+',
 *   left: { type: 'Literal', value: 1 },
 *   right: { type: 'Literal', value: 2 }
 * };
 * ```
 */
export interface BinaryExpressionNode {
  /** Discriminant for type narrowing */
  type: "BinaryExpression";
  /** The operator being applied */
  operator: string;
  /** The left operand */
  left: ASTNode;
  /** The right operand */
  right: ASTNode;
}

/**
 * Defines the structure of a unary expression AST node.
 * Unary expressions represent operations on a single operand.
 *
 * @example
 * ```typescript
 * const unary: UnaryExpressionNode = {
 *   type: 'UnaryExpression',
 *   operator: '!',
 *   argument: { type: 'Literal', value: true }
 * };
 * ```
 */
export interface UnaryExpressionNode {
  /** Discriminant for type narrowing */
  type: "UnaryExpression";
  /** The operator being applied */
  operator: string;
  /** The operand */
  argument: ASTNode;
}

/**
 * Defines the structure of a conditional expression AST node.
 * Conditional expressions represent ternary operations (condition ? consequent : alternate).
 *
 * @example
 * ```typescript
 * const conditional: ConditionalExpressionNode = {
 *   type: 'ConditionalExpression',
 *   test: { type: 'Literal', value: true },
 *   consequent: { type: 'Literal', value: 'yes' },
 *   alternate: { type: 'Literal', value: 'no' }
 * };
 * ```
 */
export interface ConditionalExpressionNode {
  /** Discriminant for type narrowing */
  type: "ConditionalExpression";
  /** The condition to test */
  test: ASTNode;
  /** The expression to evaluate if condition is truthy */
  consequent: ASTNode;
  /** The expression to evaluate if condition is falsy */
  alternate: ASTNode;
}

/**
 * Defines the structure of a parsed expression result.
 * Contains the AST, extracted dependencies, and original expression for caching purposes.
 *
 * @example
 * ```typescript
 * const parsed: ParsedExpression = {
 *   ast: { type: 'Literal', value: 42 },
 *   dependencies: [],
 *   originalExpression: '42'
 * };
 * ```
 */
export interface ParsedExpression {
  /** The root AST node of the parsed expression */
  ast: ASTNode;
  /** Array of dependency names extracted from the expression */
  dependencies: string[];
  /** The original expression string that was parsed */
  originalExpression: string;
}
