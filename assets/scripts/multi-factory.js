Events.on(ClientLoadEvent, () => {
    // Get all blocks registered in the game
    let allBlocks = Vars.content.blocks();

    for (let i = 0; i < allBlocks.size; i++) {
        let block = allBlocks.get(i);

        // Filter: Only target blocks belonging to your mod that contain a productionList
        if (block.name.startsWith("gregdustry-") && block.customData) {
            initializeMultiFactory(block);
            Log.info(`[Gregdustry] ${block.name} Loaded as MultiFactory`)
        }
    }
    Log.info("[Gregdustry] Dynamically initialized all Multi-Factory components.");
});

function initializeMultiFactory(block) {
    // 1. Force structural parameters on the target block configuration
    block.configurable = true;
    block.hasItems = true;
    block.hasLiquids = true;
    block.hasPower = true;
    block.update = true;

    // 2. Parse the recipe array mapped from the Hjson structure
    block.parsedRecipes = [];
    let list = block.productionList;
    
    for (let i = 0; i < list.length; i++) {
        let raw = list[i];
        block.parsedRecipes.push({
            id: i,
            output: Vars.content.item(raw.produces) || Vars.content.liquid(raw.produces),
            outputAmount: raw.amount || 1,
            isLiquidOutput: Vars.content.liquid(raw.produces) != null,
            craftTime: raw.speed || 60,
            inputs: raw.using || []
        });
    }

    // 3. Attach the selection UI button matrix
    block.buildConfiguration = function(tile, table) {
        block.parsedRecipes.forEach(recipe => {
            if (!recipe.output) return;
            table.button(new TextureRegionDrawable(recipe.output.uiIcon), Styles.cleari, () => {
                tile.configure(recipe.id);
            }).size(50).pad(4);
        });
    };

    // 4. Overwrite the entity building instance runtime loops
    block.buildType = () => extend(Building, {
        _recipeId: -1,
        _progress: 0,

        configure(value) {
            this._recipeId = value;
            this._progress = 0;
        },

        config() {
            return java.lang.Integer.valueOf(this._recipeId);
        },

        updateTile() {
            if (this._recipeId === -1) return;
            let recipe = block.parsedRecipes[this._recipeId];
            
            if (this.hasInputs(recipe)) {
                let boostMultiplier = 1.0;
                
                recipe.inputs.forEach(req => {
                    if (req.allowFlammableAlternatives) {
                        let usedItem = this.getBestFlammableItem(req.name);
                        if (usedItem) {
                            boostMultiplier = Math.max(boostMultiplier, usedItem.flammability);
                        }
                    }
                });

                // Delta time frame step processing
                this._progress += (Time.delta * boostMultiplier) / recipe.craftTime;
                
                if (this._progress >= 1) {
                    this.consumeInputs(recipe);
                    this.produceOutput(recipe);
                    this._progress = 0;
                }
            }
        },

        getBestFlammableItem(baseName) {
            let base = Vars.content.item(baseName);
            if (this.items.get(base) > 0) return base;
            
            let best = null;
            for (let i = 0; i < Vars.content.items().size; i++) {
                let item = Vars.content.items().get(i);
                if (item.flammability > 0 && this.items.get(item) > 0) {
                    if (!best || item.flammability > best.flammability) best = item;
                }
            }
            return best;
        },

        hasInputs(recipe) {
            for (let i = 0; i < recipe.inputs.length; i++) {
                let req = recipe.inputs[i];
                let baseItem = Vars.content.item(req.name);
                
                if (baseItem && this.items.get(baseItem) >= req.amount) continue;

                if (req.allowFlammableAlternatives) {
                    let substituteFound = false;
                    for (let j = 0; j < Vars.content.items().size; j++) {
                        let item = Vars.content.items().get(j);
                        if (item.flammability > 0 && this.items.get(item) >= req.amount) {
                            substituteFound = true;
                            break;
                        }
                    }
                    if (substituteFound) continue;
                }
                return false;
            }
            return true;
        },

        consumeInputs(recipe) {
            recipe.inputs.forEach(req => {
                let item = Vars.content.item(req.name);
                if (item) {
                    this.items.remove(item, req.amount);
                } else if (req.allowFlammableAlternatives) {
                    let sub = this.getBestFlammableItem(req.name);
                    if (sub) this.items.remove(sub, req.amount);
                }
            });
        },

        produceOutput(recipe) {
            if (!recipe.isLiquidOutput) {
                this.handleStack(recipe.output, recipe.outputAmount, this);
            } else {
                this.liquids.handleStack(recipe.output, recipe.outputAmount, this);
            }
        }
    });

    Log.info("[Gregdustry] Configured multi-factory module for block: " + block.name);
}