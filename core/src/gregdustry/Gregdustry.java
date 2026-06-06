package gregdustry;

import mindustry.mod.Mod;
import gregdustry.world.blocks.MultiFactory;

public class Gregdustry extends Mod {

    @Override
    public void loadContent() {
        // Registers your custom factory type directly to the core game engine
        new MultiFactory("limestone-furnace");
    }
}