import re


def snake_to_camel(string: str) -> str:
    """
    Convert a snake case string to camel case.

    Args:
        string (str): The snake case string to convert
            Examples: "hello_world", "my_variable_name"

    Returns:
        str: The converted camel case string
            Examples: "helloWorld", "myVariableName"

    Examples:
        >>> to_camel("hello_world")
        'helloWorld'
        >>> to_camel("my_variable_name")
        'myVariableName'
    """
    return re.sub(r"_([a-z])", lambda x: x.group(1).upper(), string)


def pascal_to_snake(pascal_str: str) -> str:
    """
    Convert a Pascal case string to snake case.

    Args:
        pascal_str (str): The Pascal case string to convert
            Examples: "ThisIsATest", "HTTPResponse", "XMLParser"

    Returns:
        str: The converted snake case string
            Examples: "this_is_a_test", "http_response", "xml_parser"

    Raises:
        TypeError: If input is not a string
        ValueError: If input string is empty

    Examples:
        >>> pascal_to_snake("ThisIsATest")
        'this_is_a_test'
        >>> pascal_to_snake("HTTPResponse")
        'http_response'
        >>> pascal_to_snake("XMLParser")
        'xml_parser'
    """
    if not isinstance(pascal_str, str):
        raise TypeError("Input must be a string")

    if not pascal_str:
        raise ValueError("Input string cannot be empty")

    # Handle special cases where we have consecutive uppercase letters (e.g., XML, HTTP)
    # First, find all such sequences and convert them to Title case
    # For example: "XMLParser" -> "XmlParser"
    pattern = r"([A-Z]+)(?=[A-Z][a-z]|\d|\W|$)"
    processed_str = re.sub(pattern, lambda m: m.group(1).title(), pascal_str)

    # Now insert underscores between words and convert to lowercase
    snake_case = re.sub(r"(?<!^)(?=[A-Z])", "_", processed_str).lower()

    return snake_case


def index_to_letters(index: int) -> str:
    """
    Convert a zero-based index to an Excel-style column reference.

    Args:
        index (int): The zero-based index to convert
            Examples: 0, 25, 26, 51

    Returns:
        str: The Excel-style column reference
            Examples: "A", "Z", "AA", "AZ"

    Examples:
        >>> index_to_letters(0)
        'A'
        >>> index_to_letters(25)
        'Z'
        >>> index_to_letters(26)
        'AA'
    """
    letters = ""
    while index >= 0:
        letters = chr(65 + (index % 26)) + letters
        index = index // 26 - 1
    return letters
