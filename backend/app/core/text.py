import re


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r'[^a-zA-Z0-9а-яА-ЯёЁ\s-]', '', value)
    value = re.sub(r'\s+', '-', value)
    value = re.sub(r'-+', '-', value)
    return value.strip('-') or 'item'
