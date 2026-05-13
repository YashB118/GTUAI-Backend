import hashlib
import random

_ADJECTIVES = [
    "Quantum", "Silent", "Crimson", "Solar", "Cosmic", "Neon", "Arctic",
    "Shadow", "Golden", "Silver", "Iron", "Storm", "Cyber", "Lunar",
    "Swift", "Brave", "Stellar", "Digital", "Mystic", "Hyper", "Turbo",
    "Sonic", "Phantom", "Crystal", "Thunder", "Velocity", "Vivid", "Nimble",
    "Binary", "Atomic", "Vector", "Parallel", "Infinite", "Radiant", "Dark",
    "Bright", "Rapid", "Zenith", "Prism", "Blaze", "Ember", "Azure",
    "Cobalt", "Prime", "Apex", "Nova", "Kinetic", "Astral", "Obsidian",
    "Verdant", "Titanium", "Spectral", "Lucid", "Virulent", "Feral",
]

_ANIMALS = [
    "Tiger", "Falcon", "Wolf", "Hawk", "Panther", "Jaguar", "Lynx",
    "Eagle", "Raven", "Phoenix", "Dragon", "Cobra", "Viper", "Condor",
    "Osprey", "Cheetah", "Puma", "Bison", "Griffin", "Mantis", "Otter",
    "Kestrel", "Dingo", "Mamba", "Raptor", "Coyote", "Badger", "Heron",
    "Narwhal", "Axolotl", "Wolverine", "Wombat", "Gecko", "Iguana",
    "Puffin", "Capybara", "Quokka", "Okapi", "Tapir", "Mandrill",
    "Serval", "Ocelot", "Caracal", "Quoll", "Dhole", "Fossa",
    "Saiga", "Binturong", "Kinkajou", "Visayan", "Meerkat",
]


def generate_pseudonym(user_id: str, room_id: str) -> str:
    """Deterministic, stable pseudonym per (user, room) pair."""
    digest = hashlib.sha256(f"{user_id}:{room_id}".encode()).hexdigest()
    rng = random.Random(int(digest, 16) & 0xFFFFFFFF)
    return f"{rng.choice(_ADJECTIVES)}{rng.choice(_ANIMALS)}"


def generate_unique_pseudonym(user_id: str, room_id: str, existing: list[str]) -> str:
    base = generate_pseudonym(user_id, room_id)
    if base not in existing:
        return base
    for suffix in range(2, 99):
        candidate = f"{base}{suffix}"
        if candidate not in existing:
            return candidate
    return f"User{random.randint(1000, 9999)}"
