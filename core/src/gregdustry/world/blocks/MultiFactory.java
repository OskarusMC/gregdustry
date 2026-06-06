package gregdustry.world.blocks;

import arc.struct.Seq;
import arc.util.Time;
import arc.util.io.Reads;
import arc.util.io.Writes;
import mindustry.Vars;
import mindustry.ctype.UnlockableContent;
import mindustry.gen.Building;
import mindustry.type.Item;
import mindustry.type.Liquid;
import mindustry.world.Block;

public class MultiFactory extends Block {
    // This public field matches your Hjson key name perfectly
    public Seq<RecipeData> productionList = new Seq<>();
    public Seq<ParsedRecipe> parsedRecipes = new Seq<>();

    public MultiFactory(String name) {
        super(name);
        update = true;
        configurable = true;
        hasItems = true;
        hasLiquids = true;
    }

    // Temporary layout structures for the Hjson reader
    public static class RecipeData {
        public String produces;
        public int speed = 60;
        public int amount = 1;
        public Seq<InputData> using = new Seq<>();
    }

    public static class InputData {
        public String name;
        public int amount = 1;
        public boolean allowFlammableAlternatives = false;
    }

    // Cleaned-up recipe structures for runtime logic loops
    public static class ParsedRecipe {
        public int id;
        public UnlockableContent output;
        public int amount;
        public boolean isLiquid;
        public float craftTime;
        public Seq<InputData> inputs;
    }

    @Override
    public void init() {
        super.init();

        // Convert the raw Hjson string data into real game Content objects
        for (int i = 0; i < productionList.size; i++) {
            RecipeData raw = productionList.get(i);
            ParsedRecipe recipe = new ParsedRecipe();
            recipe.id = i;

            // Look up items first, then fall back to liquids
            recipe.output = Vars.content.item(raw.produces);
            if (recipe.output == null) {
                recipe.output = Vars.content.liquid(raw.produces);
                recipe.isLiquid = true;
            }

            recipe.amount = raw.amount;
            recipe.craftTime = raw.speed;
            recipe.inputs = raw.using;

            if (recipe.output != null) {
                parsedRecipes.add(recipe);
            }
        }
    }



    public class MultiFactoryBuilding extends Building {
        public int recipeId = -1;
        public float progress = 0;

        @Override
        public void updateTile() {
            if (recipeId == -1 || recipeId >= parsedRecipes.size) return;
            ParsedRecipe recipe = parsedRecipes.get(recipeId);

            if (hasInputs(recipe)) {
                float boostMultiplier = 1.0f;

                for (InputData req : recipe.inputs) {
                    if (req.allowFlammableAlternatives) {
                        Item usedItem = getBestFlammableItem(req.name);
                        if (usedItem != null) {
                            boostMultiplier = Math.max(boostMultiplier, usedItem.flammability);
                        }
                    }
                }

                // Tick progress calculation
                progress += (Time.delta * boostMultiplier) / recipe.craftTime;

                if (progress >= 1f) {
                    consumeInputs(recipe);
                    produceOutput(recipe);
                    progress = 0f;
                }
            }
        }

        public boolean hasInputs(ParsedRecipe recipe) {
            for (InputData req : recipe.inputs) {
                Item baseItem = Vars.content.item(req.name);
                if (baseItem != null && items.get(baseItem) >= req.amount) continue;

                if (req.allowFlammableAlternatives) {
                    boolean substituteFound = false;
                    for (int i = 0; i < Vars.content.items().size; i++) {
                        Item item = Vars.content.items().get(i);
                        if (item.flammability > 0 && items.get(item) >= req.amount) {
                            substituteFound = true;
                            break;
                        }
                    }
                    if (substituteFound) continue;
                }
                return false;
            }
            return true;
        }

        public void consumeInputs(ParsedRecipe recipe) {
            for (InputData req : recipe.inputs) {
                Item item = Vars.content.item(req.name);
                if (item != null && items.get(item) >= req.amount) {
                    items.remove(item, req.amount);
                } else if (req.allowFlammableAlternatives) {
                    Item sub = getBestFlammableItem(req.name);
                    if (sub != null) items.remove(sub, req.amount);
                }
            }
        }

        public void produceOutput(ParsedRecipe recipe) {
            if (!recipe.isLiquid) {
                this.handleStack((Item) recipe.output, recipe.amount, this);
            } else {
                // Correct v158.1 method for adding liquids directly to the building
                this.handleLiquid(this, (Liquid) recipe.output, recipe.amount);
            }
        }

        public Item getBestFlammableItem(String baseName) {
            Item base = Vars.content.item(baseName);
            if (base != null && items.get(base) > 0) return base;

            Item best = null;
            for (int i = 0; i < Vars.content.items().size; i++) {
                Item item = Vars.content.items().get(i);
                if (item.flammability > 0 && items.get(item) > 0) {
                    if (best == null || item.flammability > best.flammability) {
                        best = item;
                    }
                }
            }
            return best;
        }

        // Network and Save Data Packet Serialization
        @Override
        public void write(Writes write) {
            super.write(write);
            write.i(recipeId);
            write.f(progress);
        }

        @Override
        public void read(Reads read, byte revision) {
            super.read(read, revision);
            recipeId = read.i();
            progress = read.f();
        }

        @Override
        public Object config() {
            return recipeId;
        }
    }
}